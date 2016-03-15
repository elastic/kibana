import _ from 'lodash';
import { __dirname as root } from './packageJson';
import { join, dirname, normalize } from 'path';

module.exports = _.flow(_.partial(join, root), normalize);
