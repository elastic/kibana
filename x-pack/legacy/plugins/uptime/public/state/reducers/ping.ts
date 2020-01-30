/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { getPingHistogram, getPingHistogramSuccess, getPingHistogramFail } from '../actions';
import { HistogramResult } from '../../../common/types';

export interface PingState {
  pingHistogram: HistogramResult | null;
  errors: any[];
  loading: boolean;
}

const initialState: PingState = {
  pingHistogram: null,
  loading: false,
  errors: [],
};

type MonitorStatusPayload = HistogramResult & Error;

export const pingReducer = handleActions<PingState, MonitorStatusPayload>(
  {
    [String(getPingHistogram)]: state => ({
      ...state,
      loading: true,
    }),

    [String(getPingHistogramSuccess)]: (state: PingState, action: Action<HistogramResult>) => ({
      ...state,
      loading: false,
      pingHistogram: { ...action.payload },
    }),

    [String(getPingHistogramFail)]: (state, action: Action<Error>) => ({
      ...state,
      errors: [...state.errors, action.payload],
      loading: false,
    }),
  },
  initialState
);
