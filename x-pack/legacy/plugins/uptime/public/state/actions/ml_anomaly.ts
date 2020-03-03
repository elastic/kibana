/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAsyncAction } from './utils';

export const getMLJobAction = createAsyncAction<{ jobId: string }, any, any>('GET_ML_JOB');

export const createMLJobAction = createAsyncAction<any, any, any>('CREATE_ML_JOB');

export const deleteMLJobAction = createAsyncAction<any, any, any>('DELETE_ML_JOB');

export const anomalyRecordsAction = createAsyncAction<any, any, any>('GET_ANOMALY_RECORDS');
