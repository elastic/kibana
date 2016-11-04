const { defaults } = require('lodash');
const babelOptions = require('../../src/optimize/babel_options');

module.exports = {
  build: {
    options: babelOptions.node,
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
