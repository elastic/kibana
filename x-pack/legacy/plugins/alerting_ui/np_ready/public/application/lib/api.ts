/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpServiceBase } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../constants';

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
  page: { index: number; size: number };
  searchText?: string;
}

export interface LoadActionsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Action[];
}

export async function loadActions({
  http,
  page,
  searchText,
}: LoadActionsOpts): Promise<LoadActionsResponse> {
  return http.get(`${BASE_ACTION_API_PATH}/_find`, {
    query: {
      page: page.index + 1,
      per_page: page.size,
      search_fields: searchText ? 'description' : undefined,
      search: searchText,
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
