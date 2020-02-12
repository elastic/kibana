/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { getMLJobAction, createMLJobAction } from '../actions';
import { IReducerState } from './types';
import { handleAsyncAction } from './utils';

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
    ...handleAsyncAction('mlJob', createMLJobAction),
    ...handleAsyncAction('mlJob', getMLJobAction),
  },
  initialState
);
