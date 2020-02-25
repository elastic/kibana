/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import {
  getMonitorDurationAction,
  getMonitorDurationActionSuccess,
  getMonitorDurationActionFail,
} from '../actions';
import { MonitorChart } from '../../../common/types';

export interface MonitorDuration {
  monitor_duration: MonitorChart | null;
  errors: any[];
  loading: boolean;
}

const initialState: MonitorDuration = {
  monitor_duration: null,
  loading: false,
  errors: [],
};

export const monitorDurationReducer = handleActions<MonitorDuration>(
  {
    [String(getMonitorDurationAction)]: state => ({
      ...state,
      loading: true,
    }),

    [String(getMonitorDurationActionSuccess)]: (state, action: Action<any>) => ({
      ...state,
      loading: false,
      monitor_duration: { ...action.payload },
    }),

    [String(getMonitorDurationActionFail)]: (state, action: Action<any>) => ({
      ...state,
      errors: [...state.errors, action.payload],
      loading: false,
    }),
  },
  initialState
);
