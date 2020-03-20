/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createAction } from 'redux-actions';
import { QueryParams } from './types';
import { Ping } from '../../../common/graphql/types';

export const getSelectedMonitorAction = createAction<{ monitorId: string }>('GET_SELECTED_MONITOR');
export const getSelectedMonitorActionSuccess = createAction<Ping>('GET_SELECTED_MONITOR_SUCCESS');
export const getSelectedMonitorActionFail = createAction<Error>('GET_SELECTED_MONITOR_FAIL');

export const getMonitorStatusAction = createAction<QueryParams>('GET_MONITOR_STATUS');
export const getMonitorStatusActionSuccess = createAction<Ping>('GET_MONITOR_STATUS_SUCCESS');
export const getMonitorStatusActionFail = createAction<Error>('GET_MONITOR_STATUS_FAIL');
