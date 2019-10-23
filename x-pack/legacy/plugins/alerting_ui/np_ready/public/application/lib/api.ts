/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpServiceBase } from 'kibana/public';
import { BASE_ACTION_API_PATH, BASE_ALERT_API_PATH } from '../constants';
import { Action, ActionType, Alert, AlertType } from '../../types';

// We are assuming there won't be many actions. This is why we will load
// all the actions in advance and assume the total count to not go over 100 or so.
// We'll set this max setting assuming it's never reached.
const MAX_ACTIONS_RETURNED = 10000;

interface LoadActionTypesOpts {
  http: HttpServiceBase;
}

type LoadActionTypesResponse = ActionType[];

interface LoadActionsOpts {
  http: HttpServiceBase;
}

interface LoadActionsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Action[];
}

interface DeleteActionsOpts {
  ids: string[];
  http: HttpServiceBase;
}

export async function loadActionTypes({
  http,
}: LoadActionTypesOpts): Promise<LoadActionTypesResponse> {
  return http.get(`${BASE_ACTION_API_PATH}/types`);
}

export async function loadAllActions({ http }: LoadActionsOpts): Promise<LoadActionsResponse> {
  return http.get(`${BASE_ACTION_API_PATH}/_find`, {
    query: {
      per_page: MAX_ACTIONS_RETURNED,
    },
  });
}

export async function saveAction({
  http,
  action,
}: {
  http: HttpServiceBase;
  action: Action;
}): Promise<Action> {
  return http.post(`${BASE_ACTION_API_PATH}`, {
    body: JSON.stringify(action),
  });
}

export async function deleteActions({ ids, http }: DeleteActionsOpts): Promise<void> {
  await Promise.all(ids.map(id => http.delete(`${BASE_ACTION_API_PATH}/${id}`)));
}

export interface LoadAlertTypesOpts {
  http: HttpServiceBase;
}

export type LoadAlertTypesResponse = AlertType[];

export async function loadAlertTypes({
  http,
}: LoadAlertTypesOpts): Promise<LoadAlertTypesResponse> {
  return http.get(`${BASE_ALERT_API_PATH}/types`);
}

export interface LoadAlertsOpts {
  http: HttpServiceBase;
  page: { index: number; size: number };
  searchText?: string;
}

export interface LoadAlertsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Alert[];
}

export async function loadAlerts({
  http,
  page,
  searchText,
}: LoadAlertsOpts): Promise<LoadAlertsResponse> {
  return http.get(`${BASE_ALERT_API_PATH}/_find`, {
    query: {
      page: page.index + 1,
      per_page: page.size,
      // TODO: Add search fields
      // search_fields: searchText ? '' : undefined,
      search: searchText,
    },
  });
}

export interface DeleteAlertsOpts {
  ids: string[];
  http: HttpServiceBase;
}

export async function deleteAlerts({ ids, http }: DeleteAlertsOpts): Promise<void> {
  await Promise.all(ids.map(id => http.delete(`${BASE_ALERT_API_PATH}/${id}`)));
}

export async function saveAlert({
  http,
  alert,
}: {
  http: HttpServiceBase;
  alert: Alert;
}): Promise<Alert> {
  return http.post(`${BASE_ALERT_API_PATH}`, {
    body: JSON.stringify(alert),
  });
}
