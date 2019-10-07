/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const FETCH_MONITOR_DETAILS = 'FETCH_MONITOR_DETAILS';
export const FETCH_MONITOR_DETAILS_SUCCESS = 'FETCH_MONITOR_DETAILS_SUCCESS';
export const FETCH_MONITOR_DETAILS_FAIL = 'FETCH_MONITOR_DETAILS_FAIL';

export interface MonitorDetailsState {
  monitorId: string;
  error: Error;
}

interface GetMonitorDetailsAction {
  type: typeof FETCH_MONITOR_DETAILS;
  payload: string;
}

interface GetMonitorDetailsSuccessAction {
  type: typeof FETCH_MONITOR_DETAILS_SUCCESS;
  payload: MonitorDetailsState;
}

interface GetMonitorDetailsFailAction {
  type: typeof FETCH_MONITOR_DETAILS_FAIL;
  payload: any;
}

export function fetchMonitorDetails(monitorId: string): GetMonitorDetailsAction {
  return {
    type: FETCH_MONITOR_DETAILS,
    payload: monitorId,
  };
}

export function fetchMonitorDetailsSuccess(
  monitorDetailsState: MonitorDetailsState
): GetMonitorDetailsSuccessAction {
  return {
    type: FETCH_MONITOR_DETAILS_SUCCESS,
    payload: monitorDetailsState,
  };
}

export function fetchMonitorDetailsFail(error: any): GetMonitorDetailsFailAction {
  return {
    type: FETCH_MONITOR_DETAILS_FAIL,
    payload: error,
  };
}

export type MonitorActionTypes =
  | GetMonitorDetailsAction
  | GetMonitorDetailsSuccessAction
  | GetMonitorDetailsFailAction;
