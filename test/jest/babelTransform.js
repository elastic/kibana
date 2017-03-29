const options = require('../../src/optimize/babel/options');
const babelJest = require('babel-jest');

const babelOptions = options.webpack;

module.exports = babelJest.createTransformer(babelOptions);
