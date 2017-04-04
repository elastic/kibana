/**
 * @name PersistedState
 *
 * @extends Events
 */

import _ from 'lodash';
import toPath from 'lodash/internal/toPath';
import { PersistedStateError } from 'ui/errors';
import SimpleEmitter from 'ui/utils/simple_emitter';

function prepSetParams(key, value, path) {
  // key must be the value, set the entire state using it
  if (_.isUndefined(value) && (_.isPlainObject(key) || path.length > 0)) {
    // setting entire tree, swap the key and value to write to the state
    value = key;
    key = undefined;
  }

  // ensure the value being passed in is never mutated
  return {
    value: _.cloneDeep(value),
    key: key
  };
}

export class PersistedState {

  /**
   *
   * @param value
   * @param path
   * @param parent
   * @param silent
   * @param EmitterClass {SimpleEmitter} - a SimpleEmitter class that this class will extend. Can be used to
   * inherit a custom event emitter. For example, the EventEmitter is an "angular-ized" version
   * for angular components which automatically triggers a digest loop for every registered
   * handler.  TODO: Get rid of the need for EventEmitter by wrapping handlers that require it
   * in a special function that will handler triggering the digest loop.
   */
  constructor(value, path, parent, silent, EmitterClass = SimpleEmitter) {
    EmitterClass.call(this);

    this._EmitterClass = EmitterClass;
    this._path = this._setPath(path);
    this._parent = parent || false;

    _.forOwn(EmitterClass.prototype, (method, methodName) => {
      this[methodName] = function () {
        return EmitterClass.prototype[methodName].apply(this._parent || this, arguments);
      };
    });

    // Some validations
    if (this._parent) {
      if (this._path.length <= 0) {
        throw new PersistedStateError('PersistedState child objects must contain a path');
      }
      if (!(this._parent instanceof PersistedState)) {
        throw new PersistedStateError('Parent object must be an instance of PersistedState');
      }
    } else if (!this._path.length && value && !_.isPlainObject(value)) {
      throw new PersistedStateError('State value must be a plain object');
    }

    value = value || this._getDefault();

    // copy passed state values and create internal trackers
    (silent) ? this.setSilent(value) : this.set(value);
    this._initialized = true; // used to track state changes
  }

  get(key, def) {
    return _.cloneDeep(this._get(key, def));
  }

  set(key, value) {
    const params = prepSetParams(key, value, this._path);
    const val = this._set(params.key, params.value);
    this.emit('set');
    return val;
  }

  setSilent(key, value) {
    const params = prepSetParams(key, value, this._path);
    return this._set(params.key, params.value, true);
  }

  reset(path) {
    const keyPath = this._getIndex(path);
    const origValue = _.get(this._defaultState, keyPath);
    const currentValue = _.get(this._mergedState, keyPath);

    if (_.isUndefined(origValue)) {
      this._cleanPath(path, this._mergedState);
    } else {
      _.set(this._mergedState, keyPath, origValue);
    }

    // clean up the changedState and defaultChildState trees
    this._cleanPath(path, this._changedState);
    this._cleanPath(path, this._defaultChildState);

    if (!_.isEqual(currentValue, origValue)) this.emit('change');
  }

  /**
   *
   * @param path {String}
   * @param value {Object} The uiState to store.
   * @param silent {Boolean}
   * @returns {PersistedState}
   */
  createChild(path, value, silent) {
    this._setChild(this._getIndex(path), value, this._parent || this);
    return new PersistedState(value, this._getIndex(path), this._parent || this, silent, this._EmitterClass);
  }

  removeChild(path) {
    const origValue = _.get(this._defaultState, this._getIndex(path));

    if (_.isUndefined(origValue)) {
      this.reset(path);
    } else {
      this.set(path, origValue);
    }
  }

  getChanges() {
    return _.cloneDeep(this._changedState);
  }

  toJSON() {
    return this.get();
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  fromString(input) {
    return this.set(JSON.parse(input));
  }

  _getIndex(key) {
    if (_.isUndefined(key)) return this._path;
    return (this._path || []).concat(toPath(key));
  }

  _getPartialIndex(key) {
    const keyPath = this._getIndex(key);
    return keyPath.slice(this._path.length);
  }

  _cleanPath(path, stateTree) {
    const partialPath = this._getPartialIndex(path);
    let remove = true;

    // recursively delete value tree, when no other keys exist
    while (partialPath.length > 0) {
      const lastKey = partialPath.splice(partialPath.length - 1, 1)[0];
      const statePath = this._path.concat(partialPath);
      const stateVal = statePath.length > 0 ? _.get(stateTree, statePath) : stateTree;

      // if stateVal isn't an object, do nothing
      if (!_.isPlainObject(stateVal)) return;

      if (remove) delete stateVal[lastKey];
      if (Object.keys(stateVal).length > 0) remove = false;
    }
  }

  _getDefault() {
    const def = (this._hasPath()) ? undefined : {};
    return (this._parent ? this.get() : def);
  }

  _setPath(path) {
    const isString = _.isString(path);
    const isArray = _.isArray(path);

    if (!isString && !isArray) return [];
    return (isString) ? [this._getIndex(path)] : path;
  }

  _setChild(path, value, parent) {
    parent._defaultChildState = parent._defaultChildState || {};
    _.set(parent._defaultChildState, path, value);
  }

  _hasPath() {
    return this._path.length > 0;
  }

  _get(key, def) {
    // delegate to parent instance
    if (this._parent) return this._parent._get(this._getIndex(key), def);

    // no path and no key, get the whole state
    if (!this._hasPath() && _.isUndefined(key)) {
      return this._mergedState;
    }

    return _.get(this._mergedState, this._getIndex(key), def);
  }

  _set(key, value, silent, initialChildState) {
    const self = this;
    let stateChanged = false;
    const initialState = !this._initialized;
    const keyPath = this._getIndex(key);
    const hasKeyPath = keyPath.length > 0;

    // if this is the initial state value, save value as the default
    if (initialState) {
      this._changedState = {};
      if (!this._hasPath() && _.isUndefined(key)) this._defaultState = value;
      else this._defaultState = _.set({}, keyPath, value);
    }

    // delegate to parent instance, passing child's default value
    if (this._parent) {
      return this._parent._set(keyPath, value, silent, initialState);
    }

    // everything in here affects only the parent state
    if (!initialState) {
      // no path and no key, set the whole state
      if (!this._hasPath() && _.isUndefined(key)) {
        // compare changedState and new state, emit an event when different
        stateChanged = !_.isEqual(this._changedState, value);
        if (!initialChildState) {
          this._changedState = value;
          this._mergedState = _.cloneDeep(value);
        }
      } else {
        // check for changes at path, emit an event when different
        const curVal = hasKeyPath ? this.get(keyPath) : this._mergedState;
        stateChanged = !_.isEqual(curVal, value);

        if (!initialChildState) {
          // arrays are merge by index, not desired - ensure they are replaced
          if (_.isArray(_.get(this._mergedState, keyPath))) {
            if (hasKeyPath) _.set(this._mergedState, keyPath, undefined);
            else this._mergedState = undefined;
          }

          if (hasKeyPath) _.set(this._changedState, keyPath, value);
          else this._changedState = _.isPlainObject(value) ? value : {};
        }
      }
    }

    // update the merged state value
    const targetObj = this._mergedState || _.cloneDeep(this._defaultState);
    const sourceObj = _.merge({}, this._defaultChildState, this._changedState);

    // handler arguments are (targetValue, sourceValue, key, target, source)
    const mergeMethod = function (targetValue, sourceValue, mergeKey) {
      // if not initial state, skip default merge method (ie. return value, see note below)
      if (!initialState && !initialChildState && _.isEqual(keyPath, self._getIndex(mergeKey))) {
        // use the sourceValue or fall back to targetValue
        return !_.isUndefined(sourceValue) ? sourceValue : targetValue;
      }
    };

    // If `mergeMethod` is provided it is invoked to produce the merged values of the
    // destination and source properties.
    // If `mergeMethod` returns `undefined` the default merging method is used
    this._mergedState = _.merge(targetObj, sourceObj, mergeMethod);

    // sanity check; verify that there are actually changes
    if (_.isEqual(this._mergedState, this._defaultState)) this._changedState = {};

    if (!silent && stateChanged) this.emit('change');

    return this;
  }
}
