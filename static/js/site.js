/* ClassFull public site — animations & interactions. Dependency-free; served from our own domain (strict CSP). */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Split a heading into words that rise into view one after another (keeps <br> and highlight spans). */
  function splitWords(el) {
    var i = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            var inner = document.createElement("span"); inner.textContent = part;
            inner.style.transitionDelay = (0.12 + i++ * 0.08) + "s";
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    }
    walk(el);
    return i;
  }

  /* Count numbers up: "₹25Cr+" -> counts 0..25 keeping prefix/suffix and thousands separators. */
  function countUp(el) {
    var raw = el.getAttribute("data-count") || el.textContent;
    var m = raw.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m || reduce) return;
    var pre = m[1], numStr = m[2], post = m[3];
    var target = parseFloat(numStr.replace(/,/g, ""));
    var commas = numStr.indexOf(",") > -1;
    var start = null, dur = 1600;
    function fmt(v) {
      var n = Math.round(v);
      return commas ? n.toLocaleString("en-US") : String(n);
    }
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(target * eased) + post;
      if (p < 1) requestAnimationFrame(step); else el.textContent = raw;
    }
    el.textContent = pre + "0" + post;
    requestAnimationFrame(step);
  }

  function slider(box) {
    var track = box.querySelector("[data-track]");
    var scope = box.closest("section") || box;
    var prev = scope.querySelector("[data-prev]");
    var next = scope.querySelector("[data-next]");
    if (!track) return;
    function page() { var c = track.firstElementChild; return c ? c.getBoundingClientRect().width : track.clientWidth; }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    }
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -page(), behavior: "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: page(), behavior: "smooth" }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  document.addEventListener("DOMContentLoaded", function () {
    /* hero heading */
    var ah = document.querySelector("[data-ah]");
    if (ah && !reduce) {
      var words = splitWords(ah);
      requestAnimationFrame(function () { requestAnimationFrame(function () { ah.classList.add("is-in"); }); });
      document.querySelectorAll("[data-rise]").forEach(function (el, k) {
        el.style.transitionDelay = (0.25 + words * 0.08 + k * 0.15) + "s";
      });
    }
    requestAnimationFrame(function () { root.classList.add("is-ready"); });

    /* sticky header shadow */
    var nav = document.querySelector("[data-nav]");
    var onScroll = function () { if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* mobile menu */
    var toggle = document.querySelector("[data-nav-toggle]");
    var menu = document.getElementById("nav-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        menu.classList.toggle("is-open", !open);
      });
      menu.addEventListener("click", function (e) {
        if (e.target.closest("a")) { toggle.setAttribute("aria-expanded", "false"); menu.classList.remove("is-open"); }
      });
    }

    /* fade-in-up on scroll, staggered inside a group; count-up stats */
    var items = document.querySelectorAll(".reveal");
    var counters = document.querySelectorAll("[data-count]");
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          var sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains("reveal"); }) : [];
          var idx = Math.max(0, sibs.indexOf(el));
          el.style.transitionDelay = Math.min(idx * 0.1, 0.5) + "s";
          el.classList.add("is-in");
          io.unobserve(el);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      items.forEach(function (el) { io.observe(el); });
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); co.unobserve(en.target); } });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { co.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add("is-in"); });
    }

    /* flip cards: tap to flip on touch screens */
    document.querySelectorAll(".flip").forEach(function (card) {
      card.addEventListener("click", function () { card.classList.toggle("is-flipped"); });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.classList.toggle("is-flipped"); } });
    });

    /* carousels */
    document.querySelectorAll("[data-slider]").forEach(slider);

    /* FAQ accordion (one open at a time) */
    var qs = document.querySelectorAll(".faq__q");
    qs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        qs.forEach(function (o) {
          o.setAttribute("aria-expanded", "false");
          var p = document.getElementById(o.getAttribute("aria-controls")); if (p) p.hidden = true;
        });
        if (!open) {
          btn.setAttribute("aria-expanded", "true");
          var panel = document.getElementById(btn.getAttribute("aria-controls")); if (panel) panel.hidden = false;
        }
      });
    });

    /* About "+" expander */
    document.querySelectorAll("[data-expand]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        if (panel) panel.hidden = open;
      });
    });
  });
})();
