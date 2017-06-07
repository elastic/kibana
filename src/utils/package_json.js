import { dirname } from 'path';

export default {
  __filename: require.resolve('../../package.json'),
  __dirname: dirname(require.resolve('../../package.json')),
  ...require('../../package.json')
};
