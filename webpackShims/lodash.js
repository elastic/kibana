/**
 * THESE ARE AUTOMATICALLY INCLUDED IN LODASH
 *
 * use:
 * var _ = require('lodash');
 */

const _ = require('node_modules/lodash/index.js').runInContext();
const { lodashStringMixin } = require('ui/utils/lodash-mixins/string');
const { lodashLangMixin } = require('ui/utils/lodash-mixins/lang');
const { lodashObjectMixin } = require('ui/utils/lodash-mixins/object');
const { lodashCollectionMixin } = require('ui/utils/lodash-mixins/collection');
const { lodashFunctionMixin } = require('ui/utils/lodash-mixins/function');
const { lodashOopMixin } = require('ui/utils/lodash-mixins/oop');

lodashStringMixin(_);
lodashLangMixin(_);
lodashObjectMixin(_);
lodashCollectionMixin(_);
lodashFunctionMixin(_);
lodashOopMixin(_);

module.exports = _;
