/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpServiceBase } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../constants';

// We are assuming there won't be many actions. This is why we will load
// all the actions in advance and assume the total count to not go over 100 or so.
// We'll set this max setting assuming it's never reached.
const MAX_ACTIONS_RETURNED = 10000;

export interface ActionType {
  id: string;
  name: string;
}

export interface Action {
  secrets: Record<string, any>;
  id: string;
  actionTypeId: string;
  description: string;
  config: Record<string, any>;
}

export interface LoadActionTypesOpts {
  http: HttpServiceBase;
}

export type LoadActionTypesResponse = ActionType[];

export async function loadActionTypes({
  http,
}: LoadActionTypesOpts): Promise<LoadActionTypesResponse> {
  return http.get(`${BASE_ACTION_API_PATH}/types`);
}

export interface LoadActionsOpts {
  http: HttpServiceBase;
}

export interface LoadActionsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Action[];
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

export interface DeleteActionsOpts {
  ids: string[];
  http: HttpServiceBase;
}

export async function deleteActions({ ids, http }: DeleteActionsOpts): Promise<void> {
  await Promise.all(ids.map(id => http.delete(`${BASE_ACTION_API_PATH}/${id}`)));
}
