'use strict';

let relative = require('path').relative;

module.exports = function pathContains(root, child) {
  return relative(root, child).slice(0, 2) !== '..';
};
