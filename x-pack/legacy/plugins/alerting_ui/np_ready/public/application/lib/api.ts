/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpServiceBase } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../constants';

export interface Action {
  id: string;
  actionTypeId: string;
  description: string;
  config: Record<string, unknown>;
}

export interface LoadActionsOpts {
  http: HttpServiceBase;
  sort: { field: string; direction: 'asc' | 'desc' };
  page: { index: number; size: number };
}

export interface LoadActionsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Action[];
}

export async function loadActions({
  http,
  sort,
  page,
}: LoadActionsOpts): Promise<LoadActionsResponse> {
  return http.get(`${BASE_ACTION_API_PATH}/_find`, {
    query: {
      sort_field: sort.field,
      sort_order: sort.direction,
      page: page.index + 1,
      per_page: page.size,
    },
  });
}
