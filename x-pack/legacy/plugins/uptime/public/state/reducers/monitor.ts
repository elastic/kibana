/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  MonitorActionTypes,
  MonitorDetailsState,
  FETCH_MONITOR_DETAILS,
  FETCH_MONITOR_DETAILS_SUCCESS,
  FETCH_MONITOR_DETAILS_FAIL,
  FETCH_MONITOR_LOCATIONS,
  FETCH_MONITOR_LOCATIONS_SUCCESS,
  FETCH_MONITOR_LOCATIONS_FAIL,
} from '../actions/monitor';
import { MonitorLocations } from '../../../common/runtime_types';

type MonitorLocationsList = Map<string, MonitorLocations>;

export interface MonitorState {
  loading: boolean;
  errors: any[];
  monitorDetailsList: MonitorDetailsState[];
  monitorLocationsList: MonitorLocationsList;
}

const initialState: MonitorState = {
  monitorDetailsList: [],
  monitorLocationsList: new Map(),
  loading: false,
  errors: [],
};

export function monitorReducer(state = initialState, action: MonitorActionTypes): MonitorState {
  switch (action.type) {
    case FETCH_MONITOR_DETAILS:
      return {
        ...state,
        loading: true,
      };
    case FETCH_MONITOR_DETAILS_SUCCESS:
      const { monitorId } = action.payload;
      return {
        ...state,
        monitorDetailsList: {
          ...state.monitorDetailsList,
          [monitorId]: action.payload,
        },
        loading: false,
      };
    case FETCH_MONITOR_DETAILS_FAIL:
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    case FETCH_MONITOR_LOCATIONS:
      return {
        ...state,
        loading: true,
      };
    case FETCH_MONITOR_LOCATIONS_SUCCESS:
      const monLocations = state.monitorLocationsList;
      monLocations.set(action.payload.monitorId, action.payload);
      return {
        ...state,
        monitorLocationsList: monLocations,
        loading: false,
      };
    case FETCH_MONITOR_LOCATIONS_FAIL:
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    default:
      return state;
  }
}
