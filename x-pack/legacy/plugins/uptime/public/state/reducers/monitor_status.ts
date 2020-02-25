/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { handleActions, Action } from 'redux-actions';
import {
  getSelectedMonitor,
  getSelectedMonitorSuccess,
  getSelectedMonitorFail,
  getMonitorStatus,
  getMonitorStatusSuccess,
  getMonitorStatusFail,
} from '../actions';
import { Ping } from '../../../common/graphql/types';
import { QueryParams } from '../actions/types';

export interface MonitorStatusState {
  status: Ping | null;
  monitor: Ping | null;
  loading: boolean;
}

const initialState: MonitorStatusState = {
  status: null,
  monitor: null,
  loading: false,
};

type MonitorStatusPayload = QueryParams & Ping;

export const monitorStatusReducer = handleActions<MonitorStatusState, MonitorStatusPayload>(
  {
    [String(getSelectedMonitor)]: (state, action: Action<QueryParams>) => ({
      ...state,
      loading: true,
    }),

    [String(getSelectedMonitorSuccess)]: (state, action: Action<Ping>) => ({
      ...state,
      loading: false,
      monitor: { ...action.payload } as Ping,
    }),

    [String(getSelectedMonitorFail)]: (state, action: Action<any>) => ({
      ...state,
      loading: false,
    }),

    [String(getMonitorStatus)]: (state, action: Action<QueryParams>) => ({
      ...state,
      loading: true,
    }),

    [String(getMonitorStatusSuccess)]: (state, action: Action<Ping>) => ({
      ...state,
      loading: false,
      status: { ...action.payload } as Ping,
    }),

    [String(getMonitorStatusFail)]: (state, action: Action<any>) => ({
      ...state,
      loading: false,
    }),
  },
  initialState
);
