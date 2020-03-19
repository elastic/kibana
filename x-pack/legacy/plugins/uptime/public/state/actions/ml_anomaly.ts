/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { createAsyncAction } from './utils';

export const resetMLState = createAction('RESET_ML_STATE');

export const getExistingMLJobAction = createAsyncAction<{ monitorId: string }, any>(
  'GET_EXISTING_ML_JOB'
);

export const createMLJobAction = createAsyncAction<any, any>('CREATE_ML_JOB');

export const deleteMLJobAction = createAsyncAction<any, any>('DELETE_ML_JOB');

export interface AnomalyRecordsParams {
  dateStart: number;
  dateEnd: number;
  listOfMonitorIds: string[];
  anomalyThreshold?: number;
}

export const getAnomalyRecordsAction = createAsyncAction<AnomalyRecordsParams, any>(
  'GET_ANOMALY_RECORDS'
);
