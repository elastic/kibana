/**
 * THESE ARE AUTOMATICALLY INCLUDED IN LODASH
 *
 * use:
 * var _ = require('lodash');
 */

var _ = require('node_modules/lodash/index.js').runInContext();
var lodashStringMixin = require('ui/utils/lodash-mixins/string').lodashStringMixin;
var lodashLangMixin = require('ui/utils/lodash-mixins/lang').lodashLangMixin;
var lodashObjectMixin = require('ui/utils/lodash-mixins/object').lodashObjectMixin;
var lodashCollectionMixin = require('ui/utils/lodash-mixins/collection').lodashCollectionMixin;
var lodashFunctionMixin = require('ui/utils/lodash-mixins/function').lodashFunctionMixin;
var lodashOopMixin = require('ui/utils/lodash-mixins/oop').lodashOopMixin;

lodashStringMixin(_);
lodashLangMixin(_);
lodashObjectMixin(_);
lodashCollectionMixin(_);
lodashFunctionMixin(_);
lodashOopMixin(_);

module.exports = _;
