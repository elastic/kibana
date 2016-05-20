var defaults = require('lodash').defaults;
const babelOptions = require('../../src/optimize/babel_options');

require('source-map-support').install();
require('babel/register')(defaults({
  ignore: [
    'test/fixtures/scenarios/**/*',
    'node_modules/**',
  ]
}, babelOptions.node));
