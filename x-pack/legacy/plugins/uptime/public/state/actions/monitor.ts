/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const FETCH_MONITOR_DETAILS = 'FETCH_MONITOR_DETAILS';
export const FETCH_MONITOR_DETAILS_SUCCESS = 'FETCH_MONITOR_DETAILS_SUCCESS';
export const FETCH_MONITOR_DETAILS_FAIL = 'FETCH_MONITOR_DETAILS_FAIL';

export interface MonitorDetailsState {
  error: Error;
}

export interface MonitorDetailsRequest {
  monitorId: string;
  checkGroup: string;
}

interface GetMonitorDetailsAction {
  type: typeof FETCH_MONITOR_DETAILS;
  payload: MonitorDetailsRequest;
}

interface GetMonitorDetailsSuccessAction {
  type: typeof FETCH_MONITOR_DETAILS_SUCCESS;
  payload: MonitorDetailsState;
}

interface GetMonitorDetailsFailAction {
  type: typeof FETCH_MONITOR_DETAILS_FAIL;
  payload: any;
}

export function fetchMonitorDetails(
  monitorDetailsState: MonitorDetailsRequest
): GetMonitorDetailsAction {
  return {
    type: FETCH_MONITOR_DETAILS,
    payload: monitorDetailsState,
  };
}

export type MonitorActionTypes =
  | GetMonitorDetailsAction
  | GetMonitorDetailsSuccessAction
  | GetMonitorDetailsFailAction;
