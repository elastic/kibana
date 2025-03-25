/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { MapAdapter, VectorTileAdapter } from '../inspector';
import { getShowMapsInspectorAdapter } from '../kibana_services';

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

interface EventHandlers {
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
export interface NonSerializableInstancesState {
  inspectorAdapters: Adapters;
  cancelRequestCallbacks: Map<symbol, () => void>;
  eventHandlers: Record<string, any>;
  chartsPaletteServiceGetColor: (() => string) | null;
  onMapMove?: () => void;
}

export interface RegisterCancelCallbackAction {
  type: 'REGISTER_CANCEL_CALLBACK';
  requestToken: symbol;
  callback: () => void;
}

export interface UnregisterCancelCallbackAction {
  type: 'UNREGISTER_CANCEL_CALLBACK';
  requestToken: symbol;
}

export interface SetEventHandlersAction {
  type: 'SET_EVENT_HANDLERS';
  eventHandlers: Record<string, any>;
}

export interface SetChartsPaletteServiceGetColorAction {
  type: 'SET_CHARTS_PALETTE_SERVICE_GET_COLOR';
  chartsPaletteServiceGetColor: () => string;
}

export interface SetOnMapMoveAction {
  type: 'SET_ON_MAP_MOVE';
  onMapMove: () => void;
}

export type NonSerializableInstancesAction =
  | RegisterCancelCallbackAction
  | UnregisterCancelCallbackAction
  | SetEventHandlersAction
  | SetChartsPaletteServiceGetColorAction
  | SetOnMapMoveAction;

function createInspectorAdapters(): Adapters {
  const inspectorAdapters: Adapters = {
    requests: new RequestAdapter(),
    vectorTiles: new VectorTileAdapter(),
  };
  if (getShowMapsInspectorAdapter()) {
    inspectorAdapters.map = new MapAdapter();
  }
  return inspectorAdapters;
}

export function nonSerializableInstances(
  state: NonSerializableInstancesState | undefined,
  action: NonSerializableInstancesAction
): NonSerializableInstancesState {
  if (!state) {
    return {
      inspectorAdapters: createInspectorAdapters(),
      cancelRequestCallbacks: new Map(),
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
    case SET_EVENT_HANDLERS:
      return {
        ...state,
        eventHandlers: action.eventHandlers,
      };
    case SET_CHARTS_PALETTE_SERVICE_GET_COLOR:
      return {
        ...state,
        chartsPaletteServiceGetColor: action.chartsPaletteServiceGetColor,
      };
    case SET_ON_MAP_MOVE:
      return {
        ...state,
        onMapMove: action.onMapMove,
      };
    default:
      return state;
  }
}

// Selectors
export const getInspectorAdapters = (state: {
  nonSerializableInstances: NonSerializableInstancesState;
}) => {
  return state.nonSerializableInstances.inspectorAdapters;
};

export const getCancelRequestCallbacks = (state: {
  nonSerializableInstances: NonSerializableInstancesState;
}) => {
  return state.nonSerializableInstances.cancelRequestCallbacks;
};

export const getEventHandlers = (state: {
  nonSerializableInstances: NonSerializableInstancesState;
}) => {
  return state.nonSerializableInstances.eventHandlers;
};

export function getChartsPaletteServiceGetColor(state: {
  nonSerializableInstances: NonSerializableInstancesState;
}) {
  return state.nonSerializableInstances.chartsPaletteServiceGetColor;
}

export function getOnMapMove(state: { nonSerializableInstances: NonSerializableInstancesState }) {
  return state.nonSerializableInstances.onMapMove;
}

// Actions
export const registerCancelCallback = (
  requestToken: symbol,
  callback: () => void
): RegisterCancelCallbackAction => {
  return {
    type: REGISTER_CANCEL_CALLBACK,
    requestToken,
    callback,
  };
};

export const unregisterCancelCallback = (requestToken: symbol): UnregisterCancelCallbackAction => {
  return {
    type: UNREGISTER_CANCEL_CALLBACK,
    requestToken,
  };
};

export const cancelRequest = (requestToken: symbol) => {
  return (dispatch: any, getState: any) => {
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

export const setEventHandlers = (
  eventHandlers: Record<string, any> = {}
): SetEventHandlersAction => {
  return {
    type: SET_EVENT_HANDLERS,
    eventHandlers,
  };
};

export function setChartsPaletteServiceGetColor(
  chartsPaletteServiceGetColor: () => string
): SetChartsPaletteServiceGetColorAction {
  return {
    type: SET_CHARTS_PALETTE_SERVICE_GET_COLOR,
    chartsPaletteServiceGetColor,
  };
}

export function setOnMapMove(onMapMove: () => void): SetOnMapMoveAction {
  return {
    type: SET_ON_MAP_MOVE,
    onMapMove,
  };
}
