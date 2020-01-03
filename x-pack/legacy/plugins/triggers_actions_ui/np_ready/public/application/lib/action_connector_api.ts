/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../constants';
import { ActionConnector, ActionConnectorWithoutId, ActionType } from '../../types';

// We are assuming there won't be many actions. This is why we will load
// all the actions in advance and assume the total count to not go over 100 or so.
// We'll set this max setting assuming it's never reached.
const MAX_ACTIONS_RETURNED = 10000;

export async function loadActionTypes({ http }: { http: HttpSetup }): Promise<ActionType[]> {
  return await http.get(`${BASE_ACTION_API_PATH}/types`);
}

export async function loadAllActions({
  http,
}: {
  http: HttpSetup;
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: ActionConnector[];
}> {
  return await http.get(`${BASE_ACTION_API_PATH}/_find`, {
    query: {
      per_page: MAX_ACTIONS_RETURNED,
    },
  });
}

export async function createActionConnector({
  http,
  connector,
}: {
  http: HttpSetup;
  connector: Omit<ActionConnectorWithoutId, 'referencedByCount'>;
}): Promise<ActionConnector> {
  return await http.post(`${BASE_ACTION_API_PATH}`, {
    body: JSON.stringify(connector),
  });
}

export async function updateActionConnector({
  http,
  connector,
  id,
}: {
  http: HttpSetup;
  connector: Pick<ActionConnectorWithoutId, 'name' | 'config' | 'secrets'>;
  id: string;
}): Promise<ActionConnector> {
  return await http.put(`${BASE_ACTION_API_PATH}/${id}`, {
    body: JSON.stringify({
      name: connector.name,
      config: connector.config,
      secrets: connector.secrets,
    }),
  });
}

export async function deleteActions({
  ids,
  http,
}: {
  ids: string[];
  http: HttpSetup;
}): Promise<{ successes: string[]; errors: string[] }> {
  const successes: string[] = [];
  const errors: string[] = [];
  await Promise.all(ids.map(id => http.delete(`${BASE_ACTION_API_PATH}/${id}`))).then(function(
    values
  ) {
    errors.push(...values.filter(v => v.state === 'rejected'));
    successes.push(...values.filter(v => v.state === 'fulfilled'));
  });
  return { successes, errors };
}
