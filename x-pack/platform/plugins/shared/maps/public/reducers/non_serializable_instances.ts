/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { Map as MapApi } from '@kbn/mapbox-gl';
import type { AnyAction } from 'redux-v4';
import type { ThunkDispatch } from 'redux-thunk-v2';
import { maplibregl } from '@kbn/mapbox-gl';
import { MapAdapter, VectorTileAdapter } from '../inspector';
import { getShowMapsInspectorAdapter } from '../kibana_services';
import type { MapStoreState } from './store';
import { MAP_EXTENT_CHANGED } from '../actions';
import type { MapCenterAndZoom, MapExtent } from '../../common/descriptor_types';
import { clampToLatBounds, clampToLonBounds } from '../../common/elasticsearch_util';
import type { MapViewContext } from './map';
import { getMapCenter, getMapZoom } from '../selectors/map_selectors';

const REGISTER_CANCEL_CALLBACK = 'REGISTER_CANCEL_CALLBACK';
const UNREGISTER_CANCEL_CALLBACK = 'UNREGISTER_CANCEL_CALLBACK';
const SET_EVENT_HANDLERS = 'SET_EVENT_HANDLERS';
const SET_CHARTS_PALETTE_SERVICE_GET_COLOR = 'SET_CHARTS_PALETTE_SERVICE_GET_COLOR';
const SET_ON_MAP_MOVE = 'SET_ON_MAP_MOVE';
const SET_MAP_API = 'SET_MAP_API';

export interface NonSerializableState {
  inspectorAdapters: Adapters;
  cancelRequestCallbacks: Map<symbol, () => {}>; // key is request token, value is cancel callback
  eventHandlers: Partial<EventHandlers>;
  chartsPaletteServiceGetColor: (value: string) => string | null;
  onMapMove?: (lat: number, lon: number, zoom: number) => void;
  mapApi?: MapApi;
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
    case SET_MAP_API: {
      return {
        ...state,
        mapApi: action.mapApi,
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

export function getMapApi({ nonSerializableInstances }: MapStoreState) {
  return nonSerializableInstances.mapApi;
}

export function getMapReady({ nonSerializableInstances }: MapStoreState) {
  return Boolean(nonSerializableInstances.mapApi);
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

export function setMapApi(mapApi?: MapApi) {
  return {
    type: SET_MAP_API,
    mapApi,
  };
}

export function jumpTo({ lat, lon, zoom }: MapCenterAndZoom) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const prevMapCenter = getMapCenter(getState());
    const prevZoom = getMapZoom(getState());

    if (lat === prevMapCenter.lat && lon === prevMapCenter.lon && zoom === prevZoom) {
      // map already at jumpTo location
      return;
    }

    dispatch({
      type: MAP_EXTENT_CHANGED,
      mapViewContext: {
        // Clear buffer when jumping to new zoom so mapExtentChanged action recomputes it on moveend.
        ...(prevZoom !== zoom && { buffer: undefined }),
        center: { lat, lon },
        zoom,
      } as Pick<MapViewContext, 'center' | 'zoom'>,
    });
    const mapApi = getMapApi(getState());
    if (mapApi) {
      mapApi.jumpTo({
        zoom,
        center: [lon, lat],
      });
    }
  };
}

export function fitMapToBounds(bounds: MapExtent) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const mapApi = getMapApi(getState());
    if (!mapApi) {
      // eslint-disable-next-line no-console
      console.warn('Unable to fit to bounds, Map API is not available.');
      return;
    }

    // clamping to -89/89 latitudes since Mapboxgl does not seem to handle bounds that contain the poles (logs errors to the console when using -90/90)
    const lnLatBounds = new maplibregl.LngLatBounds(
      new maplibregl.LngLat(clampToLonBounds(bounds.minLon), clampToLatBounds(bounds.minLat)),
      new maplibregl.LngLat(clampToLonBounds(bounds.maxLon), clampToLatBounds(bounds.maxLat))
    );
    // maxZoom ensure we're not zooming in too far on single points or small shapes
    // the padding is to avoid too tight of a fit around edges
    mapApi.fitBounds(lnLatBounds, { maxZoom: 17, padding: 16 });
  };
}
