define(function (require) {
  let _ = require('lodash');

  /**
   * just a place to put feature detection checks
   */
  return {
    cssFilters: (function () {
      let e = document.createElement('img');
      let rules = ['webkitFilter', 'mozFilter', 'msFilter', 'filter'];
      let test = 'grayscale(1)';
      rules.forEach(function (rule) { e.style[rule] = test; });

      document.body.appendChild(e);
      let styles = window.getComputedStyle(e);
      let can = _(styles).pick(rules).includes(test);
      document.body.removeChild(e);

      return can;
    }())
  };

});
