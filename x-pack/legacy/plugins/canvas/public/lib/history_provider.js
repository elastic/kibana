/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import lzString from 'lz-string';
import { createMemoryHistory, parsePath, createPath } from 'history';
import createHashStateHistory from 'history-extra';
import { getWindow } from './get_window';

function wrapHistoryInstance(history) {
  const historyState = {
    onChange: [],
    prevLocation: {},
    changeUnlisten: null,
  };

  const locationFormat = (location, action, parser) => ({
    pathname: location.pathname,
    hash: location.hash,
    search: location.search,
    state: parser(location.state),
    action: action.toLowerCase(),
  });

  const wrappedHistory = {
    undo() {
      history.goBack();
    },

    redo() {
      history.goForward();
    },

    go(idx) {
      history.go(idx);
    },

    parse(payload) {
      try {
        const stateJSON = lzString.decompress(payload);
        return JSON.parse(stateJSON);
      } catch (e) {
        return null;
      }
    },

    encode(state) {
      try {
        const stateJSON = JSON.stringify(state);
        return lzString.compress(stateJSON);
      } catch (e) {
        throw new Error('Could not encode state: ', e.message);
      }
    },

    getLocation() {
      const location = history.location;
      return {
        ...location,
        state: this.parse(location.state),
      };
    },

    getPath(path) {
      if (path != null) {
        return createPath(parsePath(path));
      }
      return createPath(this.getLocation());
    },

    getFullPath(path) {
      if (path != null) {
        return history.createHref(parsePath(path));
      }
      return history.createHref(this.getLocation());
    },

    push(state, path) {
      history.push(path || this.getPath(), this.encode(state));
    },

    replace(state, path) {
      history.replace(path || this.getPath(), this.encode(state));
    },

    onChange(fn) {
      // if no handler fn passed, do nothing
      if (fn == null) {
        return;
      }

      // push onChange function onto listener stack and return a function to remove it
      const pushedIndex = historyState.onChange.push(fn) - 1;
      return (() => {
        // only allow the unlisten function to be called once
        let called = false;
        return () => {
          if (called) {
            return;
          }
          historyState.onChange.splice(pushedIndex, 1);
          called = true;
        };
      })();
    },

    resetOnChange() {
      // splice to clear the onChange array, and remove listener for each fn
      historyState.onChange.splice(0);
    },

    get historyInstance() {
      // getter to get access to the underlying history instance
      return history;
    },
  };

  // track the initial history location and create update listener
  historyState.prevLocation = wrappedHistory.getLocation();
  historyState.changeUnlisten = history.listen((location, action) => {
    const { prevLocation } = historyState;
    const locationObj = locationFormat(location, action, wrappedHistory.parse);
    const prevLocationObj = locationFormat(prevLocation, action, wrappedHistory.parse);

    // execute all listeners
    historyState.onChange.forEach(fn => fn.call(null, locationObj, prevLocationObj));

    // track the updated location
    historyState.prevLocation = wrappedHistory.getLocation();
  });

  return wrappedHistory;
}

const instances = new WeakMap();

const getHistoryInstance = win => {
  // if no window object, use memory module
  if (typeof win === 'undefined' || !win.history) {
    return createMemoryHistory();
  }
  return createHashStateHistory();
};

export const historyProvider = (win = getWindow()) => {
  // return cached instance if one exists
  const instance = instances.get(win);
  if (instance) {
    return instance;
  }

  // create and cache wrapped history instance
  const historyInstance = getHistoryInstance(win);
  const wrappedInstance = wrapHistoryInstance(historyInstance);
  instances.set(win, wrappedInstance);

  return wrappedInstance;
};
