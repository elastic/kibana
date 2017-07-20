import _ from 'lodash';

/**
 * just a place to put feature detection checks
 */
export const supports = {
  cssFilters: (function () {
    const e = document.createElement('img');
    const rules = ['webkitFilter', 'mozFilter', 'msFilter', 'filter'];
    const test = 'grayscale(1)';
    rules.forEach(function (rule) { e.style[rule] = test; });

    document.body.appendChild(e);
    const styles = window.getComputedStyle(e);
    const can = _(styles).pick(rules).includes(test);
    document.body.removeChild(e);

    return can;
  }())
};

