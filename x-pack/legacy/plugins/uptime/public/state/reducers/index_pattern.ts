/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { handleActions, Action } from 'redux-actions';
import { getIndexPattern, getIndexPatternSuccess, getIndexPatternFail } from '../actions';

export interface IndexPatternState {
  index_pattern: any;
  errors: any[];
  loading: boolean;
}

const initialState: IndexPatternState = {
  index_pattern: null,
  loading: false,
  errors: [],
};

export const indexPatternReducer = handleActions<IndexPatternState>(
  {
    [String(getIndexPattern)]: state => ({
      ...state,
      loading: true,
    }),

    [String(getIndexPatternSuccess)]: (state, action: Action<any>) => ({
      ...state,
      loading: false,
      index_pattern: { ...action.payload },
    }),

    [String(getIndexPatternFail)]: (state, action: Action<any>) => ({
      ...state,
      errors: [...state.errors, action.payload],
      loading: false,
    }),
  },
  initialState
);
