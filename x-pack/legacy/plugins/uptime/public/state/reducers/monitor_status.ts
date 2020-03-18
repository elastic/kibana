/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { handleActions, Action } from 'redux-actions';
import {
  getSelectedMonitorAction,
  getSelectedMonitorActionSuccess,
  getSelectedMonitorActionFail,
  getMonitorStatusAction,
  getMonitorStatusActionSuccess,
  getMonitorStatusActionFail,
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
    [String(getSelectedMonitorAction)]: (state, action: Action<QueryParams>) => ({
      ...state,
      loading: true,
    }),

    [String(getSelectedMonitorActionSuccess)]: (state, action: Action<Ping>) => ({
      ...state,
      loading: false,
      monitor: { ...action.payload } as Ping,
    }),

    [String(getSelectedMonitorActionFail)]: (state, action: Action<any>) => ({
      ...state,
      loading: false,
    }),

    [String(getMonitorStatusAction)]: (state, action: Action<QueryParams>) => ({
      ...state,
      loading: true,
    }),

    [String(getMonitorStatusActionSuccess)]: (state, action: Action<Ping>) => ({
      ...state,
      loading: false,
      status: { ...action.payload } as Ping,
    }),

    [String(getMonitorStatusActionFail)]: (state, action: Action<any>) => ({
      ...state,
      loading: false,
    }),
  },
  initialState
);
