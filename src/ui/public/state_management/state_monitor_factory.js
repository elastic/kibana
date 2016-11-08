import { cloneDeep, isEqual, set, isPlainObject } from 'lodash';

export default {
  create: (state, customInitialState) => stateMonitor(state, customInitialState)
};

function stateMonitor(state, customInitialState) {
  let destroyed = false;
  let ignoredProps = [];
  let changeHandlers = [];
  let initialState;

  setInitialState(customInitialState);

  function setInitialState(customInitialState) {
    // state.toJSON returns a reference, clone so we can mutate it safely
    initialState = cloneDeep(customInitialState) || cloneDeep(state.toJSON());
  }

  function removeIgnoredProps(state) {
    ignoredProps.forEach(path => {
      set(state, path, true);
    });
    return state;
  }

  function getStatus() {
    // state.toJSON returns a reference, clone so we can mutate it safely
    const currentState = removeIgnoredProps(cloneDeep(state.toJSON()));
    const isClean = isEqual(currentState, initialState);

    return {
      clean: isClean,
      dirty: !isClean,
    };
  }

  function dispatchChange(type = null, keys = []) {
    const status = getStatus();
    changeHandlers.forEach(changeHandler => {
      changeHandler(status, type, keys);
    });
  }

  function dispatchFetch(keys) {
    dispatchChange('fetch_with_changes', keys);
  }

  function dispatchSave(keys) {
    dispatchChange('save_with_changes', keys);
  }

  function dispatchReset(keys) {
    dispatchChange('reset_with_changes', keys);
  }

  return {
    setInitialState(customInitialState) {
      if (!isPlainObject(customInitialState)) throw new TypeError('The default state must be an object');

      // check the current status
      const previousStatus = getStatus();

      // update the initialState and apply ignoredProps
      setInitialState(customInitialState);
      removeIgnoredProps(initialState);

      // fire the change handler if the status has changed
      if (!isEqual(previousStatus, getStatus())) dispatchChange();
    },

    ignoreProps(props) {
      ignoredProps = ignoredProps.concat(props);
      removeIgnoredProps(initialState);
      return this;
    },

    onChange(callback) {
      if (destroyed) throw new Error('Monitor has been destroyed');
      if (typeof callback !== 'function') throw new Error('onChange handler must be a function');

      changeHandlers.push(callback);

      // Listen for state events.
      state.on('fetch_with_changes', dispatchFetch);
      state.on('save_with_changes', dispatchSave);
      state.on('reset_with_changes', dispatchReset);

      // if the state is already dirty, fire the change handler immediately
      const status = getStatus();
      if (status.dirty) dispatchChange();

      return this;
    },

    destroy() {
      destroyed = true;
      changeHandlers = undefined;
      state.off('fetch_with_changes', dispatchFetch);
      state.off('save_with_changes', dispatchSave);
      state.off('reset_with_changes', dispatchReset);
    }
  };
}
