/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { QueryParams } from './types';

export const getMonitorDurationAction = createAction<QueryParams>('GET_MONITOR_DURATION');
export const getMonitorDurationActionSuccess = createAction<QueryParams>(
  'GET_MONITOR_DURATION_SUCCESS'
);
export const getMonitorDurationActionFail = createAction<QueryParams>('GET_MONITOR_DURATION_FAIL');
