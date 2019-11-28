/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpServiceBase } from 'kibana/public';
import { BASE_ACTION_API_PATH, BASE_ALERT_API_PATH } from '../constants';
import { ActionConnector, ActionType, Alert, AlertType } from '../../types';

// We are assuming there won't be many actions. This is why we will load
// all the actions in advance and assume the total count to not go over 100 or so.
// We'll set this max setting assuming it's never reached.
const MAX_ACTIONS_RETURNED = 10000;
const WATCHER_API_ROOT = '/api/watcher';

export async function loadActionTypes({ http }: { http: HttpServiceBase }): Promise<ActionType[]> {
  return http.get(`${BASE_ACTION_API_PATH}/types`);
}

export async function loadAllActions({
  http,
}: {
  http: HttpServiceBase;
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: ActionConnector[];
}> {
  return http.get(`${BASE_ACTION_API_PATH}/_find`, {
    query: {
      per_page: MAX_ACTIONS_RETURNED,
    },
  });
}

export async function createActionConnector({
  http,
  connector,
}: {
  http: HttpServiceBase;
  connector: ActionConnector;
}): Promise<ActionConnector> {
  return http.post(`${BASE_ACTION_API_PATH}`, {
    body: JSON.stringify(connector),
  });
}

export async function updateActionConnector({
  http,
  connector,
  id,
}: {
  http: HttpServiceBase;
  connector: ActionConnector;
  id: string;
}): Promise<ActionConnector> {
  return http.put(`${BASE_ACTION_API_PATH}/${id}`, {
    body: JSON.stringify({ ...connector, id: undefined, actionTypeId: undefined }),
  });
}

export async function deleteActions({
  ids,
  http,
}: {
  ids: string[];
  http: HttpServiceBase;
}): Promise<void> {
  await Promise.all(ids.map(id => http.delete(`${BASE_ACTION_API_PATH}/${id}`)));
}

export async function loadAlertTypes({ http }: { http: HttpServiceBase }): Promise<AlertType[]> {
  return http.get(`${BASE_ALERT_API_PATH}/types`);
}

export async function loadAlerts({
  http,
  page,
  searchText,
  tagsFilter,
  typesFilter,
}: {
  http: HttpServiceBase;
  page: { index: number; size: number };
  searchText?: string;
  tagsFilter?: string[];
  typesFilter?: string[];
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: Alert[];
}> {
  const filters = [];
  if (tagsFilter && tagsFilter.length) {
    filters.push(`alert.attributes.tags:(${tagsFilter.join(' and ')})`);
  }
  if (typesFilter && typesFilter.length) {
    filters.push(`alert.attributes.alertTypeId:(${typesFilter.join(' or ')})`);
  }
  return http.get(`${BASE_ALERT_API_PATH}/_find`, {
    query: {
      page: page.index + 1,
      per_page: page.size,
      search_fields: searchText ? 'name' : undefined,
      search: searchText,
      filter: filters.length ? filters.join(' ') : undefined,
    },
  });
}

export async function deleteAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpServiceBase;
}): Promise<void> {
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

export async function enableAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpServiceBase;
}): Promise<void> {
  await Promise.all(ids.map(id => http.post(`${BASE_ALERT_API_PATH}/${id}/_enable`)));
}

export async function disableAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpServiceBase;
}): Promise<void> {
  await Promise.all(ids.map(id => http.post(`${BASE_ALERT_API_PATH}/${id}/_disable`)));
}

export async function muteAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpServiceBase;
}): Promise<void> {
  await Promise.all(ids.map(id => http.post(`${BASE_ALERT_API_PATH}/${id}/_mute_all`)));
}

export async function unmuteAlerts({
  ids,
  http,
}: {
  ids: string[];
  http: HttpServiceBase;
}): Promise<void> {
  await Promise.all(ids.map(id => http.post(`${BASE_ALERT_API_PATH}/${id}/_unmute_all`)));
}

// TODO: replace watcher api with the proper from alerts

export async function getMatchingIndicesForThresholdAlertType({
  pattern,
  http,
}: {
  pattern: string;
  http: HttpServiceBase;
}): Promise<Record<string, any>> {
  if (!pattern.startsWith('*')) {
    pattern = `*${pattern}`;
  }
  if (!pattern.endsWith('*')) {
    pattern = `${pattern}*`;
  }
  const { indices } = await http.post(`${WATCHER_API_ROOT}/indices`, {
    body: JSON.stringify({ pattern }),
  });
  return indices;
}

export async function getThresholdAlertTypeFields({
  indexes,
  http,
}: {
  indexes: string[];
  http: HttpServiceBase;
}): Promise<Record<string, any>> {
  const { fields } = await http.post(`${WATCHER_API_ROOT}/fields`, {
    body: JSON.stringify({ indexes }),
  });
  return fields;
}

let savedObjectsClient: any;

export const setSavedObjectsClient = (aSavedObjectsClient: any) => {
  savedObjectsClient = aSavedObjectsClient;
};

export const getSavedObjectsClient = () => {
  return savedObjectsClient;
};

export const loadIndexPatterns = async () => {
  const { savedObjects } = await getSavedObjectsClient().find({
    type: 'index-pattern',
    fields: ['title'],
    perPage: 10000,
  });
  return savedObjects;
};

export async function getThresholdAlertVisualizationData({
  model,
  visualizeOptions,
  http,
}: {
  model: any;
  visualizeOptions: any;
  http: HttpServiceBase;
}): Promise<Record<string, any>> {
  const { visualizeData } = await http.post(`${WATCHER_API_ROOT}/watch/visualize`, {
    body: JSON.stringify({
      watch: model,
      options: visualizeOptions,
    }),
  });
  return visualizeData;
}
