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
} from '../actions/monitor';

export interface MonitorState {
  monitorDetailsList: MonitorDetailsState[];
  loading: boolean;
  errors: any[];
}

const initialState: MonitorState = {
  monitorDetailsList: [],
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
      const error = action.payload;
      return {
        ...state,
        errors: [...state.errors, error],
      };
    default:
      return state;
  }
}
