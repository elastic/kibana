import _ from 'lodash';
var root = require('./packageJson').__dirname;
var { join, dirname, normalize } = require('path');

module.exports = _.flow(_.partial(join, root), normalize);
