import _ from 'lodash';

/**
 * just a place to put feature detection checks
 */
export default {
  cssFilters: (function () {
    var e = document.createElement('img');
    var rules = ['webkitFilter', 'mozFilter', 'msFilter', 'filter'];
    var test = 'grayscale(1)';
    rules.forEach(function (rule) { e.style[rule] = test; });

    document.body.appendChild(e);
    var styles = window.getComputedStyle(e);
    var can = _(styles).pick(rules).includes(test);
    document.body.removeChild(e);

    return can;
  }())
};

