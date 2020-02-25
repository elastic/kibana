/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { RequestAdapter } from '../../../../../../src/plugins/inspector/public';
import { MapAdapter } from '../inspector/adapters/map_adapter';

const REGISTER_CANCEL_CALLBACK = 'REGISTER_CANCEL_CALLBACK';
const UNREGISTER_CANCEL_CALLBACK = 'UNREGISTER_CANCEL_CALLBACK';
const SET_EVENT_HANDLERS = 'SET_EVENT_HANDLERS';

function createInspectorAdapters() {
  const inspectorAdapters = {
    requests: new RequestAdapter(),
  };
  if (chrome.getInjected('showMapsInspectorAdapter', false)) {
    inspectorAdapters.map = new MapAdapter();
  }
  return inspectorAdapters;
}

// Reducer
export function nonSerializableInstances(state, action = {}) {
  if (!state) {
    return {
      inspectorAdapters: createInspectorAdapters(),
      cancelRequestCallbacks: new Map(), // key is request token, value is cancel callback
      eventHandlers: {},
    };
  }

  switch (action.type) {
    case REGISTER_CANCEL_CALLBACK:
      state.cancelRequestCallbacks.set(action.requestToken, action.callback);
      return {
        ...state,
      };
    case UNREGISTER_CANCEL_CALLBACK:
      state.cancelRequestCallbacks.delete(action.requestToken);
      return {
        ...state,
      };
    case SET_EVENT_HANDLERS: {
      return {
        ...state,
        eventHandlers: action.eventHandlers,
      };
    }
    default:
      return state;
  }
}

// Selectors
export const getInspectorAdapters = ({ nonSerializableInstances }) => {
  return nonSerializableInstances.inspectorAdapters;
};

export const getCancelRequestCallbacks = ({ nonSerializableInstances }) => {
  return nonSerializableInstances.cancelRequestCallbacks;
};

export const getEventHandlers = ({ nonSerializableInstances }) => {
  return nonSerializableInstances.eventHandlers;
};

// Actions
export const registerCancelCallback = (requestToken, callback) => {
  return {
    type: REGISTER_CANCEL_CALLBACK,
    requestToken,
    callback,
  };
};

export const unregisterCancelCallback = requestToken => {
  return {
    type: UNREGISTER_CANCEL_CALLBACK,
    requestToken,
  };
};

export const cancelRequest = requestToken => {
  return (dispatch, getState) => {
    if (!requestToken) {
      return;
    }

    const cancelCallback = getCancelRequestCallbacks(getState()).get(requestToken);
    if (cancelCallback) {
      cancelCallback();
      dispatch(unregisterCancelCallback(requestToken));
    }
  };
};

export const setEventHandlers = (eventHandlers = {}) => {
  return {
    type: SET_EVENT_HANDLERS,
    eventHandlers,
  };
};
