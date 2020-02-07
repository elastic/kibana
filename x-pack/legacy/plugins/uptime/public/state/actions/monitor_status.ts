/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createAction } from 'redux-actions';
import { QueryParams } from './types';

export const getSelectedMonitor = createAction<{ monitorId: string }>('GET_SELECTED_MONITOR');
export const getSelectedMonitorSuccess = createAction<QueryParams>('GET_SELECTED_MONITOR_SUCCESS');
export const getSelectedMonitorFail = createAction<QueryParams>('GET_SELECTED_MONITOR_FAIL');

export const getMonitorStatus = createAction<QueryParams>('GET_MONITOR_STATUS');
export const getMonitorStatusSuccess = createAction<QueryParams>('GET_MONITOR_STATUS_SUCCESS');
export const getMonitorStatusFail = createAction<QueryParams>('GET_MONITOR_STATUS_FAIL');
