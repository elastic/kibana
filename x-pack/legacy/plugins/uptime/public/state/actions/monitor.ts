/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorLocations } from '../../../common/runtime_types';
import { QueryParams } from './types';

export const FETCH_MONITOR_DETAILS = 'FETCH_MONITOR_DETAILS';
export const FETCH_MONITOR_DETAILS_SUCCESS = 'FETCH_MONITOR_DETAILS_SUCCESS';
export const FETCH_MONITOR_DETAILS_FAIL = 'FETCH_MONITOR_DETAILS_FAIL';

export const FETCH_MONITOR_LOCATIONS = 'FETCH_MONITOR_LOCATIONS';
export const FETCH_MONITOR_LOCATIONS_SUCCESS = 'FETCH_MONITOR_LOCATIONS_SUCCESS';
export const FETCH_MONITOR_LOCATIONS_FAIL = 'FETCH_MONITOR_LOCATIONS_FAIL';

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

export interface MonitorLocationsPayload extends QueryParams {
  monitorId: string;
}

interface GetMonitorLocationsAction {
  type: typeof FETCH_MONITOR_LOCATIONS;
  payload: MonitorLocationsPayload;
}

interface GetMonitorLocationsSuccessAction {
  type: typeof FETCH_MONITOR_LOCATIONS_SUCCESS;
  payload: MonitorLocations;
}

interface GetMonitorLocationsFailAction {
  type: typeof FETCH_MONITOR_LOCATIONS_FAIL;
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

export function fetchMonitorLocations(payload: MonitorLocationsPayload): GetMonitorLocationsAction {
  return {
    type: FETCH_MONITOR_LOCATIONS,
    payload,
  };
}

export function fetchMonitorLocationsSuccess(
  monitorLocationsState: MonitorLocations
): GetMonitorLocationsSuccessAction {
  return {
    type: FETCH_MONITOR_LOCATIONS_SUCCESS,
    payload: monitorLocationsState,
  };
}

export function fetchMonitorLocationsFail(error: any): GetMonitorLocationsFailAction {
  return {
    type: FETCH_MONITOR_LOCATIONS_FAIL,
    payload: error,
  };
}

export type MonitorActionTypes =
  | GetMonitorDetailsAction
  | GetMonitorDetailsSuccessAction
  | GetMonitorDetailsFailAction
  | GetMonitorLocationsAction
  | GetMonitorLocationsSuccessAction
  | GetMonitorLocationsFailAction;
