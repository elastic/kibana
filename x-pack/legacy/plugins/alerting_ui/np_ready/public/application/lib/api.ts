/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpServiceBase } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../constants';
import { ActionType, Action } from '../../types';

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
