/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { handleActions, Action } from 'redux-actions';
import { getMonitorStatus, getMonitorStatusSuccess, getMonitorStatusFail } from '../actions';
import { Ping } from '../../../common/graphql/types';
import { QueryParams } from '../actions/types';

export interface MonitorStatusState {
  status: Ping | null;
  loading: boolean;
}

const initialState: MonitorStatusState = {
  status: null,
  loading: false,
};

type MonitorStatusPayload = QueryParams & string & boolean & number & Map<string, string[]>;

export const monitorStatusReducer = handleActions<MonitorStatusState, MonitorStatusPayload>(
  {
    [String(getMonitorStatus)]: (state, action: Action<QueryParams>) => ({
      ...state,
      loading: true,
    }),

    [String(getMonitorStatusSuccess)]: (state, action: Action<string>) => ({
      ...state,
      basePath: action.payload as string,
    }),

    [String(getMonitorStatusFail)]: (state, action: Action<number>) => ({
      ...state,
      loading: false,
    }),
  },
  initialState
);
