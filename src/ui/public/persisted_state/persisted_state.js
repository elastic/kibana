define(function (require) {
  let _ = require('lodash');
  let toPath = require('lodash/internal/toPath');
  let errors = require('ui/errors');

  return function (Private) {
    let Events = Private(require('ui/events'));
    let SimpleEmitter = require('ui/utils/SimpleEmitter');

    function validateParent(parent, path) {
      if (path.length <= 0) {
        throw new errors.PersistedStateError('PersistedState child objects must contain a path');
      }

      if (parent instanceof PersistedState) return;
      throw new errors.PersistedStateError('Parent object must be an instance of PersistedState');
    }

    function validateValue(value) {
      let msg = 'State value must be a plain object';
      if (!value) return;
      if (!_.isPlainObject(value)) throw new errors.PersistedStateError(msg);
    }

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

    function parentDelegationMixin(from, to) {
      _.forOwn(from.prototype, function (method, methodName) {
        to.prototype[methodName] = function () {
          return from.prototype[methodName].apply(this._parent || this, arguments);
        };
      });
    }

    _.class(PersistedState).inherits(Events);
    parentDelegationMixin(SimpleEmitter, PersistedState);
    parentDelegationMixin(Events, PersistedState);

    function PersistedState(value, path, parent, silent) {
      PersistedState.Super.call(this);

      this._path = this._setPath(path);
      this._parent = parent || false;

      if (this._parent) {
        validateParent(this._parent, this._path);
      } else if (!this._path.length) {
        validateValue(value);
      }

      value = value || this._getDefault();

      // copy passed state values and create internal trackers
      (silent) ? this.setSilent(value) : this.set(value);
      this._initialized = true; // used to track state changes
    }

    PersistedState.prototype.get = function (key, def) {
      return _.cloneDeep(this._get(key, def));
    };

    PersistedState.prototype.set = function (key, value) {
      let params = prepSetParams(key, value, this._path);
      let val = this._set(params.key, params.value);
      this.emit('set');
      return val;
    };

    PersistedState.prototype.setSilent = function (key, value) {
      let params = prepSetParams(key, value, this._path);
      return this._set(params.key, params.value, true);
    };

    PersistedState.prototype.reset = function (path) {
      let keyPath = this._getIndex(path);
      let origValue = _.get(this._defaultState, keyPath);
      let currentValue = _.get(this._mergedState, keyPath);

      if (_.isUndefined(origValue)) {
        this._cleanPath(path, this._mergedState);
      } else {
        _.set(this._mergedState, keyPath, origValue);
      }

      // clean up the changedState and defaultChildState trees
      this._cleanPath(path, this._changedState);
      this._cleanPath(path, this._defaultChildState);

      if (!_.isEqual(currentValue, origValue)) this.emit('change');
    };

    PersistedState.prototype.createChild = function (path, value, silent) {
      this._setChild(this._getIndex(path), value, this._parent || this);
      return new PersistedState(value, this._getIndex(path), this._parent || this, silent);
    };

    PersistedState.prototype.removeChild = function (path) {
      let origValue = _.get(this._defaultState, this._getIndex(path));

      if (_.isUndefined(origValue)) {
        this.reset(path);
      } else {
        this.set(path, origValue);
      }
    };

    PersistedState.prototype.getChanges = function () {
      return _.cloneDeep(this._changedState);
    };

    PersistedState.prototype.toJSON = function () {
      return this.get();
    };

    PersistedState.prototype.toString = function () {
      return JSON.stringify(this.toJSON());
    };

    PersistedState.prototype.fromString = function (input) {
      return this.set(JSON.parse(input));
    };

    PersistedState.prototype._getIndex = function (key) {
      if (_.isUndefined(key)) return this._path;
      return (this._path || []).concat(toPath(key));
    };

    PersistedState.prototype._getPartialIndex = function (key) {
      let keyPath = this._getIndex(key);
      return keyPath.slice(this._path.length);
    };

    PersistedState.prototype._cleanPath = function (path, stateTree) {
      let partialPath = this._getPartialIndex(path);
      let remove = true;

      // recursively delete value tree, when no other keys exist
      while (partialPath.length > 0) {
        let lastKey = partialPath.splice(partialPath.length - 1, 1)[0];
        let statePath = this._path.concat(partialPath);
        let stateVal = statePath.length > 0 ? _.get(stateTree, statePath) : stateTree;

        // if stateVal isn't an object, do nothing
        if (!_.isPlainObject(stateVal)) return;

        if (remove) delete stateVal[lastKey];
        if (Object.keys(stateVal).length > 0) remove = false;
      }
    };

    PersistedState.prototype._getDefault = function () {
      let def = (this._hasPath()) ? undefined : {};
      return (this._parent ? this.get() : def);
    };

    PersistedState.prototype._setPath = function (path) {
      let isString = _.isString(path);
      let isArray = _.isArray(path);

      if (!isString && !isArray) return [];
      return (isString) ? [this._getIndex(path)] : path;
    };

    PersistedState.prototype._setChild = function (path, value, parent) {
      parent._defaultChildState = parent._defaultChildState || {};
      _.set(parent._defaultChildState, path, value);
    };

    PersistedState.prototype._hasPath = function () {
      return this._path.length > 0;
    };

    PersistedState.prototype._get = function (key, def) {
      // delegate to parent instance
      if (this._parent) return this._parent._get(this._getIndex(key), def);

      // no path and no key, get the whole state
      if (!this._hasPath() && _.isUndefined(key)) {
        return this._mergedState;
      }

      return _.get(this._mergedState, this._getIndex(key), def);
    };

    PersistedState.prototype._set = function (key, value, silent, initialChildState) {
      let self = this;
      let stateChanged = false;
      let initialState = !this._initialized;
      let keyPath = this._getIndex(key);
      let hasKeyPath = keyPath.length > 0;

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
          let curVal = hasKeyPath ? this.get(keyPath) : this._mergedState;
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
      let targetObj = this._mergedState || _.cloneDeep(this._defaultState);
      let sourceObj = _.merge({}, this._defaultChildState, this._changedState);

      // handler arguments are (targetValue, sourceValue, key, target, source)
      let mergeMethod = function (targetValue, sourceValue, mergeKey) {
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
    };

    return PersistedState;
  };
});