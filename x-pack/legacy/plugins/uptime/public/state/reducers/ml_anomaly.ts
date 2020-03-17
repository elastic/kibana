/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  getMLJobAction,
  createMLJobAction,
  getAnomalyRecordsAction,
  deleteMLJobAction,
} from '../actions';
import { IReducerState } from './types';
import { handleAsyncAction } from './utils';
import { IHttpFetchError } from '../../../../../../../target/types/core/public/http';

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

type Payload = IHttpFetchError;

export const mlJobsReducer = handleActions<MLJobState>(
  {
    ...handleAsyncAction<MLJobState, Payload>('mlJob', getMLJobAction),
    ...handleAsyncAction<MLJobState, Payload>('mlJob', createMLJobAction),
    ...handleAsyncAction<MLJobState, Payload>('mlJob', deleteMLJobAction),
    ...handleAsyncAction<MLJobState, Payload>('anomalies', getAnomalyRecordsAction),
  },
  initialState
);
