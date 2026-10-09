/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { AnyAction } from 'redux-v4';
import type { ThunkDispatch } from 'redux-thunk-v2';
import { MapAdapter, VectorTileAdapter } from '../inspector';
import { getShowMapsInspectorAdapter } from '../kibana_services';
import type { MapStoreState } from './store';

const REGISTER_CANCEL_CALLBACK = 'REGISTER_CANCEL_CALLBACK';
const UNREGISTER_CANCEL_CALLBACK = 'UNREGISTER_CANCEL_CALLBACK';
const SET_EVENT_HANDLERS = 'SET_EVENT_HANDLERS';
const SET_CHARTS_PALETTE_SERVICE_GET_COLOR = 'SET_CHARTS_PALETTE_SERVICE_GET_COLOR';
const SET_ON_MAP_MOVE = 'SET_ON_MAP_MOVE';

export interface NonSerializableState {
  inspectorAdapters: Adapters;
  cancelRequestCallbacks: Map<symbol, () => {}>; // key is request token, value is cancel callback
  eventHandlers: Partial<EventHandlers>;
  chartsPaletteServiceGetColor: (value: string) => string | null;
  onMapMove?: (lat: number, lon: number, zoom: number) => void;
}

export interface ResultMeta {
  featuresCount?: number;
}

export interface EventHandlers {
  /**
   * Take action on data load.
   */
  onDataLoad: ({ layerId, dataId }: { layerId: string; dataId: string }) => void;
  /**
   * Take action on data load end.
   */
  onDataLoadEnd: ({
    layerId,
    dataId,
    resultMeta,
  }: {
    layerId: string;
    dataId: string;
    resultMeta: ResultMeta;
  }) => void;
  /**
   * Take action on data load error.
   */
  onDataLoadError: ({
    layerId,
    dataId,
    errorMessage,
  }: {
    layerId: string;
    dataId: string;
    errorMessage: string;
  }) => void;
}

function createInspectorAdapters() {
  const inspectorAdapters: {
    requests: RequestAdapter;
    vectorTiles: VectorTileAdapter;
    map?: MapAdapter;
  } = {
    requests: new RequestAdapter(),
    vectorTiles: new VectorTileAdapter(),
  };
  if (getShowMapsInspectorAdapter()) {
    inspectorAdapters.map = new MapAdapter();
  }
  return inspectorAdapters;
}

// Reducer
export function nonSerializableInstancesReducers(
  state: NonSerializableState,
  action: Record<string, any> = {}
) {
  if (!state) {
    return {
      inspectorAdapters: createInspectorAdapters(),
      cancelRequestCallbacks: new Map(), // key is request token, value is cancel callback
      eventHandlers: {},
      chartsPaletteServiceGetColor: null,
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
    case SET_CHARTS_PALETTE_SERVICE_GET_COLOR: {
      return {
        ...state,
        chartsPaletteServiceGetColor: action.chartsPaletteServiceGetColor,
      };
    }
    case SET_ON_MAP_MOVE: {
      return {
        ...state,
        onMapMove: action.onMapMove,
      };
    }
    default:
      return state;
  }
}

// Selectors
export const getInspectorAdapters = ({ nonSerializableInstances }: MapStoreState) => {
  return nonSerializableInstances.inspectorAdapters;
};

export const getCancelRequestCallbacks = ({ nonSerializableInstances }: MapStoreState) => {
  return nonSerializableInstances.cancelRequestCallbacks;
};

export const getEventHandlers = ({ nonSerializableInstances }: MapStoreState) => {
  return nonSerializableInstances.eventHandlers;
};

export function getChartsPaletteServiceGetColor({ nonSerializableInstances }: MapStoreState) {
  return nonSerializableInstances.chartsPaletteServiceGetColor;
}

export function getOnMapMove({ nonSerializableInstances }: MapStoreState) {
  return nonSerializableInstances.onMapMove;
}

// Actions
export const registerCancelCallback = (requestToken: symbol, callback: () => void) => {
  return {
    type: REGISTER_CANCEL_CALLBACK,
    requestToken,
    callback,
  };
};

export const unregisterCancelCallback = (requestToken: symbol) => {
  return {
    type: UNREGISTER_CANCEL_CALLBACK,
    requestToken,
  };
};

export const cancelRequest = (requestToken: symbol) => {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
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

export function setChartsPaletteServiceGetColor(
  chartsPaletteServiceGetColor: ((value: string) => string) | null
) {
  return {
    type: SET_CHARTS_PALETTE_SERVICE_GET_COLOR,
    chartsPaletteServiceGetColor,
  };
}

export function setOnMapMove(onMapMove: (lat: number, lon: number, zoom: number) => void) {
  return {
    type: SET_ON_MAP_MOVE,
    onMapMove,
  };
}
