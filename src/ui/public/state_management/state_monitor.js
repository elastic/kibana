import { cloneDeep, isEqual, set } from 'lodash';

export default {
  create: (state, defaultState) => stateMonitor(state, defaultState)
};

function stateMonitor(state, defaultState) {
  let destroyed = false;
  let ignoredProps = [];

  const originalState = cloneDeep(defaultState) || cloneDeep(state.toJSON());

  const listeners = {
    fetch: [],
    save: [],
    reset: [],
  };

  function filterState(state) {
    ignoredProps.forEach(path => {
      set(state, path, true);
    });
    return state;
  }

  function getStatus() {
    const currentState = filterState(state.toJSON());
    const isClean = isEqual(currentState, originalState);

    return {
      clean: isClean,
      dirty: !isClean,
    };
  }

  function changeHandler(type, keys, handlerFn) {
    const status = getStatus();
    return handlerFn(status, type, keys);
  };

  return {
    ignoreProps(props) {
      ignoredProps = ignoredProps.concat(props);
      filterState(originalState);
      return this;
    },

    onChange(handlerFn) {
      if (destroyed) throw new Error('Monitor has been destroyed');
      if (typeof handlerFn !== 'function') throw new Error('onChange handler must be a function');

      const fetchHandler = (keys) => changeHandler('fetch_with_changes', keys, handlerFn);
      const saveHandler = (keys) => changeHandler('save_with_changes', keys, handlerFn);
      const resetHandler = (keys) => changeHandler('reset_with_changes', keys, handlerFn);

      listeners.fetch.push(fetchHandler);
      listeners.save.push(saveHandler);
      listeners.reset.push(resetHandler);

      state.on('fetch_with_changes', fetchHandler);
      state.on('save_with_changes', saveHandler);
      state.on('reset_with_changes', resetHandler);

      // if the state is already dirty, fire the change handler immediately
      const status = getStatus();
      if (status.dirty) {
        handlerFn(status, null, []);
      }

      return this;
    },

    destroy() {
      destroyed = true;
      listeners.fetch = listeners.fetch.filter(listener => {
        state.off('fetch_with_changes', listener);
        return false;
      });
      listeners.save = listeners.save.filter(listener => {
        state.off('save_with_changes', listener);
        return false;
      });
      listeners.reset = listeners.reset.filter(listener => {
        state.off('reset_with_changes', listener);
        return false;
      });
    }
  };
}
