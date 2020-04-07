/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { getMonitorList, getMonitorListSuccess, getMonitorListFailure } from '../actions';
import { MonitorSummaryResult } from '../../../common/runtime_types';

export interface MonitorList {
  list: MonitorSummaryResult;
  errors: Error[];
  loading: boolean;
}

export const initialState: MonitorList = {
  list: {
    nextPagePagination: null,
    prevPagePagination: null,
    summaries: [],
    totalSummaryCount: 0,
  },
  errors: [],
  loading: false,
};

type Payload = MonitorSummaryResult & Error;

export const monitorListReducer = handleActions<MonitorList, Payload>(
  {
    [String(getMonitorList)]: (state: MonitorList) => ({
      ...state,
      loading: true,
    }),
    [String(getMonitorListSuccess)]: (
      state: MonitorList,
      action: Action<MonitorSummaryResult>
    ) => ({
      ...state,
      loading: false,
      list: { ...action.payload },
    }),
    [String(getMonitorListFailure)]: (state: MonitorList, action: Action<Error>) => ({
      ...state,
      errors: [...state.errors, action.payload],
      loading: false,
    }),
  },
  initialState
);
