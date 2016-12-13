import _ from 'lodash';
import inflector from 'ui/indexed_array/inflector';


const pathGetter = _(_.get).rearg(1, 0).ary(2);
const inflectIndex = inflector('by');
const inflectOrder = inflector('in', 'Order');

const CLEAR_CACHE = {};
const OPT_NAMES = IndexedArray.OPT_NAMES = ['index', 'group', 'order', 'initialSet', 'immutable'];

/**
 * Generic extension of Array class, which will index (and reindex) the
 * objects it contains based on their properties.
 *
 * @class  IndexedArray
 * @module utils
 * @constructor
 * @param {object}   [config]            - describes the properties of this registry object
 * @param {string[]} [config.index]      - a list of props/paths that should be used to index the docs.
 * @param {string[]} [config.group]      - a list of keys/paths to group docs by.
 * @param {string[]} [config.order]      - a list of keys/paths to order the keys by.
 * @param {object[]} [config.initialSet] - the initial dataset the IndexedArray should contain.
 * @param {boolean}  [config.immutable]  - a flag that hints to people reading the implementation
 *                                       that this IndexedArray should not be modified. It's modification
 *                                       methods are also removed
 */
_.class(IndexedArray).inherits(Array);
function IndexedArray(config) {
  IndexedArray.Super.call(this);

  // just to remind future us that this list is important
  config = _.pick(config || {}, OPT_NAMES);

  this.raw = [];

  // setup indices
  this._indexNames = _.union(
    this._setupIndices(config.group, inflectIndex, _.organizeBy),
    this._setupIndices(config.index, inflectIndex, _.indexBy),
    this._setupIndices(config.order, inflectOrder, _.sortBy)
  );

  if (config.initialSet) {
    this.push.apply(this, config.initialSet);
  }

  if (config.immutable) {
    // just a hint, bugs caused by updates not propogating would be very
    // very very hard to track down
    this.push = this.splice = undefined;
  }
}

/**
 * Create indices for a group of object properties. getters and setters are used to
 * read and control the indices.
 *
 * @param  {string[]} props   - the properties that should be used to index docs
 * @param  {function} inflect - a function that will be called with a property name, and
 *                            creates the public property at which the index will be exposed
 * @param  {function} op      - the function that will be used to create the indices, it is passed
 *                            the raw representaion of the registry, and a getter for reading the
 *                            right prop
 *
 * @returns {string[]}        - the public keys of all indices created
 */
IndexedArray.prototype._setupIndices = function (props, inflect, op) {
  // shortcut for empty props
  if (!props || props.length === 0) return;

  const self = this;
  return props.map(function (prop) {

    const from = pathGetter.partial(prop).value();
    const to = inflect(prop);
    let cache;

    Object.defineProperty(self, to, {
      enumerable: false,
      configurable: false,

      set: function (val) {
        // can't set any value other than the CLEAR_CACHE constant
        if (val === CLEAR_CACHE) {
          cache = false;
        } else {
          throw new TypeError(to + ' can not be set, it is a computed index of values');
        }
      },
      get: function () {
        return cache || (cache = op(self.raw, from));
      }
    });

    return to;
  });

};

/**
 * (Re)run index/group/order procedures to create indices of
 * sub-objects.
 *
 * @return {undefined}
 */
IndexedArray.prototype._clearIndices = function () {
  const self = this;
  self._indexNames.forEach(function (name) {
    self[name] = CLEAR_CACHE;
  });
};

/**
 * Copy all array methods which have side-effects, and wrap them
 * in a function that will reindex after each call, as well
 * as duplex the operation to the .raw version of the IndexedArray.
 *
 * @param  {[type]} method [description]
 * @return {[type]}        [description]
 */
'pop push shift splice unshift reverse'.split(' ').forEach(function (method) {
  const orig = Array.prototype[method];

  IndexedArray.prototype[method] = function (/* args... */) {
    // call the original method with this context
    orig.apply(this, arguments);

    // run the indexers
    this._clearIndices();

    // call the original method on our "raw" array, and return the result(s)
    return orig.apply(this.raw, arguments);
  };
});

/**
* Remove items from this based on a predicate
* @param {function|object|string} predicate - the predicate used to decide what is removed
* @param {object} context - this binding for predicate
* @return {array} - the removed data
*/
IndexedArray.prototype.remove = function (predicate, context) {
  const out = _.remove(this, predicate, context);
  _.remove(this.raw, predicate, context);
  this._clearIndices();
  return out;
};

/**
 * provide a hook for the JSON serializer
 * @return {array} - a plain, vanilla array with our same data
 */
IndexedArray.prototype.toJSON = function () {
  return this.raw;
};

export default IndexedArray;
