const lodash = require('../../../node_modules/lodash/index.js');
const { lodashLangMixin } = require('ui/utils/lodash-mixins/lang');
const { lodashObjectMixin } = require('ui/utils/lodash-mixins/object');
const { lodashCollectionMixin } = require('ui/utils/lodash-mixins/collection');
const { lodashFunctionMixin } = require('ui/utils/lodash-mixins/function');
const { lodashOopMixin } = require('ui/utils/lodash-mixins/oop');

const _ = lodash.runInContext();

lodashLangMixin(_);
lodashObjectMixin(_);
lodashCollectionMixin(_);
lodashFunctionMixin(_);
lodashOopMixin(_);

module.exports = _;
