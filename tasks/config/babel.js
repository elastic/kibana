let { defaults } = require('lodash');
let babelOptions = require('requirefrom')('src')('optimize/babelOptions');

module.exports = {
  build: {
    options: defaults({
      optional: ['runtime']
    }, babelOptions),
    src: [
      'build/kibana/**/*.js',
      '!**/public/**',
      '!**/node_modules/**',
      '!**/bower_components/**',
      '!**/__tests__/**'
    ],
    dest: '.',
    expand: true
  }
};
