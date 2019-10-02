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
  monitorDetails: MonitorDetailsState[] | [];
}

const initialState: MonitorState = {
  monitorDetails: [],
};

export function uiReducer(state = initialState, action: MonitorActionTypes): MonitorState {
  switch (action.type) {
    case FETCH_MONITOR_DETAILS:
      return {
        ...state,
      };
    case FETCH_MONITOR_DETAILS_SUCCESS:
      const monitorDetails = action.payload;
      return {
        ...state,
        monitorDetails: [...state.monitorDetails, monitorDetails],
      };
    case FETCH_MONITOR_DETAILS_FAIL:
      return {
        ...state,
      };
    default:
      return state;
  }
}
