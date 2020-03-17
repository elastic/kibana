/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAsyncAction } from './utils';

export const getMLJobAction = createAsyncAction<any>('GET_ML_JOB');

export const createMLJobAction = createAsyncAction<any>('CREATE_ML_JOB');

export const deleteMLJobAction = createAsyncAction<any>('DELETE_ML_JOB');

export interface AnomalyRecordsParams {
  dateStart: string;
  dateEnd: string;
  listOfMonitorIds: string[];
  anomalyThreshold?: number;
}

export const getAnomalyRecordsAction = createAsyncAction<AnomalyRecordsParams>(
  'GET_ANOMALY_RECORDS'
);
