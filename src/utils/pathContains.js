let relative = require('path').relative;

module.exports = function pathContains(root, child) {
  return relative(child, root).slice(0, 2) !== '..';
};
