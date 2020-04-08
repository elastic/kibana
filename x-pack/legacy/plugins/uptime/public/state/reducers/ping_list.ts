/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { PingsResponse } from '../../../common/runtime_types';
import { getPings, getPingsSuccess, getPingsFail } from '../actions';

export interface PingListState {
  pingList: PingsResponse;
  errors: Error[];
  loading: boolean;
}

const initialState: PingListState = {
  pingList: {
    total: 0,
    locations: [],
    pings: [],
  },
  loading: false,
  errors: [],
};

type PingListPayload = PingsResponse & Error;

export const pingListReducer = handleActions<PingListState, PingListPayload>(
  {
    [String(getPings)]: state => ({
      ...state,
    }),

    [String(getPingsSuccess)]: (state, action: Action<PingsResponse>) => ({
      ...state,
      pingList: { ...action.payload },
    }),

    [String(getPingsFail)]: (state, action: Action<Error>) => ({
      ...state,
      errors: [...state.errors, action.payload],
    }),
  },
  initialState
);
