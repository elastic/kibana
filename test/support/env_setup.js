const defaults = require('lodash').defaults;
import babelOptions from '../../src/optimize/babel/options';

require('source-map-support').install();
require('babel-register')(defaults({
  ignore: [
    'test/fixtures/scenarios/**/*',
    'node_modules/**',
  ]
}, babelOptions.node));
