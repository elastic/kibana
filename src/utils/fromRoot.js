var _ = require('lodash');
var dirname = require('path').dirname;
var join = require('path').join;
var normalize = require('path').normalize;
var root = dirname(require('./closestPackageJson').findSync());

module.exports = _.flow(_.partial(join, root), normalize);
