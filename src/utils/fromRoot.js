import _ from 'lodash';
import { __dirname as root } from './packageJson';
var { join, dirname, normalize } = require('path');

module.exports = _.flow(_.partial(join, root), normalize);
