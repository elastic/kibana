/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { getMLJobAction } from '../actions';
import { IReducerState } from './types';

export interface MLJobState extends IReducerState {
  mlJob: any;
}

const initialState: MLJobState = {
  mlJob: null,
  loading: false,
  errors: [],
};

export const mlJobsReducer = handleActions<MLJobState>(
  {
    [String(getMLJobAction.get)]: state => ({
      ...state,
      loading: true,
    }),

    [String(getMLJobAction.success)]: (state, action: Action<any>) => ({
      ...state,
      loading: false,
      mlJob: { ...action.payload },
    }),

    [String(getMLJobAction.fail)]: (state, action: Action<any>) => ({
      ...state,
      errors: [...state.errors, action.payload],
      loading: false,
    }),
  },
  initialState
);
