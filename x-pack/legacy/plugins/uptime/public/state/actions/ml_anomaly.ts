/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAsyncAction } from './utils';

export const getMLJobAction = createAsyncAction<{ jobId: string }, any, any>('GET_ML_JOB');
