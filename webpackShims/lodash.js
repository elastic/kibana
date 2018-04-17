/**
 * THESE ARE AUTOMATICALLY INCLUDED IN LODASH
 *
 * use:
 * var _ = require('lodash');
 */

var _ = require('../node_modules/lodash/index.js').runInContext();
var lodashCollectionMixin = require('ui/utils/lodash-mixins/collection').lodashCollectionMixin;
var lodashFunctionMixin = require('ui/utils/lodash-mixins/function').lodashFunctionMixin;

lodashCollectionMixin(_);
lodashFunctionMixin(_);

module.exports = _;
