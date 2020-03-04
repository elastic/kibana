/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  getMLJobAction,
  createMLJobAction,
  anomalyRecordsAction,
  deleteMLJobAction,
} from '../actions';
import { IReducerState } from './types';
import { handleAsyncAction } from './utils';

export interface MLJobState extends IReducerState {
  mlJob: any;
  anomalies: any;
}

const initialState: MLJobState = {
  mlJob: null,
  anomalies: null,
  loading: false,
  errors: [],
};

export const mlJobsReducer = handleActions<MLJobState>(
  {
    ...handleAsyncAction<MLJobState>('mlJob', getMLJobAction),
    ...handleAsyncAction<MLJobState>('mlJob', createMLJobAction),
    ...handleAsyncAction<MLJobState>('mlJob', deleteMLJobAction),
    ...handleAsyncAction<MLJobState>('anomalies', anomalyRecordsAction),
  },
  initialState
);
