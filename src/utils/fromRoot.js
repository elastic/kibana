import _ from 'lodash';
import { join, dirname, normalize } from 'path';
var root = require('./packageJson').__dirname;

module.exports = _.flow(_.partial(join, root), normalize);
