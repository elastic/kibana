import babelOptions from '../../src/optimize/babel/options';

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
