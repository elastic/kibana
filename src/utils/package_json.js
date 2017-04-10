import { dirname } from 'path';

module.exports = require('../../package.json');
module.exports.__filename = require.resolve('../../package.json');
module.exports.__dirname = dirname(module.exports.__filename);
