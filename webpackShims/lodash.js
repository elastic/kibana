/**
 * THESE ARE AUTOMATICALLY INCLUDED IN LODASH
 *
 * use:
 * var _ = require('lodash');
 */

var _ = require('node_modules/lodash/index.js').runInContext();
require('ui/utils/lodash-mixins/string').extend(_);
require('ui/utils/lodash-mixins/lang').extend(_);
require('ui/utils/lodash-mixins/object').extend(_);
require('ui/utils/lodash-mixins/collection').extend(_);
require('ui/utils/lodash-mixins/function').extend(_);
require('ui/utils/lodash-mixins/oop').extend(_);
module.exports = _;
