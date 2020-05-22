/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  getExistingMLJobAction,
  createMLJobAction,
  getAnomalyRecordsAction,
  deleteMLJobAction,
  resetMLState,
  AnomalyRecords,
  getMLCapabilitiesAction,
} from '../actions';
import { getAsyncInitialState, handleAsyncAction } from './utils';
import { IHttpFetchError } from '../../../../../../../target/types/core/public/http';
import { AsyncInitialState } from './types';
import { PrivilegesResponse } from '../../../../../../plugins/ml/common/types/privileges';
import { CreateMLJobSuccess, DeleteJobResults } from '../actions/types';
import { JobExistResult } from '../../../../../../plugins/ml/common/types/data_recognizer';

export interface MLJobState {
  mlJob: AsyncInitialState<JobExistResult>;
  createJob: AsyncInitialState<CreateMLJobSuccess>;
  deleteJob: AsyncInitialState<DeleteJobResults>;
  anomalies: AsyncInitialState<AnomalyRecords>;
  mlCapabilities: AsyncInitialState<PrivilegesResponse>;
}

const initialState: MLJobState = {
  mlJob: getAsyncInitialState(),
  createJob: getAsyncInitialState(),
  deleteJob: getAsyncInitialState(),
  anomalies: getAsyncInitialState(),
  mlCapabilities: getAsyncInitialState(),
};

type Payload = IHttpFetchError;

export const mlJobsReducer = handleActions<MLJobState>(
  {
    ...handleAsyncAction<MLJobState, Payload>('mlJob', getExistingMLJobAction),
    ...handleAsyncAction<MLJobState, Payload>('mlCapabilities', getMLCapabilitiesAction),
    ...handleAsyncAction<MLJobState, Payload>('createJob', createMLJobAction),
    ...handleAsyncAction<MLJobState, Payload>('deleteJob', deleteMLJobAction),
    ...handleAsyncAction<MLJobState, Payload>('anomalies', getAnomalyRecordsAction),
    ...{
      [String(resetMLState)]: (state) => ({
        ...state,
        mlJob: {
          loading: false,
          data: null,
          error: null,
        },
        createJob: {
          data: null,
          error: null,
          loading: false,
        },
        deleteJob: {
          data: null,
          error: null,
          loading: false,
        },
      }),
    },
  },
  initialState
);
