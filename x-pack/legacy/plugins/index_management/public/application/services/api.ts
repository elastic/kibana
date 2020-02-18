/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  API_BASE_PATH,
  UIM_UPDATE_SETTINGS,
  UIM_INDEX_CLEAR_CACHE,
  UIM_INDEX_CLEAR_CACHE_MANY,
  UIM_INDEX_CLOSE,
  UIM_INDEX_CLOSE_MANY,
  UIM_INDEX_DELETE,
  UIM_INDEX_DELETE_MANY,
  UIM_INDEX_FLUSH,
  UIM_INDEX_FLUSH_MANY,
  UIM_INDEX_FORCE_MERGE,
  UIM_INDEX_FORCE_MERGE_MANY,
  UIM_INDEX_FREEZE,
  UIM_INDEX_FREEZE_MANY,
  UIM_INDEX_OPEN,
  UIM_INDEX_OPEN_MANY,
  UIM_INDEX_REFRESH,
  UIM_INDEX_REFRESH_MANY,
  UIM_INDEX_UNFREEZE,
  UIM_INDEX_UNFREEZE_MANY,
  UIM_TEMPLATE_DELETE,
  UIM_TEMPLATE_DELETE_MANY,
  UIM_TEMPLATE_CREATE,
  UIM_TEMPLATE_UPDATE,
  UIM_TEMPLATE_CLONE,
} from '../../../common/constants';

import { TAB_SETTINGS, TAB_MAPPING, TAB_STATS } from '../constants';

import { useRequest, sendRequest } from './use_request';
import { httpService } from './http';
import { UiMetricService } from './ui_metric';
import { Template } from '../../../common/types';
import { IndexMgmtMetricsType } from '../../types';

// Temporary hack to provide the uiMetricService instance to this file.
// TODO: Refactor and export an ApiService instance through the app dependencies context
let uiMetricService: UiMetricService<IndexMgmtMetricsType>;
export const setUiMetricService = (_uiMetricService: UiMetricService<IndexMgmtMetricsType>) => {
  uiMetricService = _uiMetricService;
};
// End hack

export async function loadIndices() {
  const response = await httpService.httpClient.get(`${API_BASE_PATH}/indices`);
  return response.data ? response.data : response;
}

export async function reloadIndices(indexNames: string[]) {
  const body = JSON.stringify({
    indexNames,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/reload`, { body });
  return response.data ? response.data : response;
}

export async function closeIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/close`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_CLOSE_MANY : UIM_INDEX_CLOSE;
  uiMetricService.trackMetric('count', eventName);
  return response;
}

export async function deleteIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/delete`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_DELETE_MANY : UIM_INDEX_DELETE;
  uiMetricService.trackMetric('count', eventName);
  return response;
}

export async function openIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/open`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_OPEN_MANY : UIM_INDEX_OPEN;
  uiMetricService.trackMetric('count', eventName);
  return response;
}

export async function refreshIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/refresh`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_REFRESH_MANY : UIM_INDEX_REFRESH;
  uiMetricService.trackMetric('count', eventName);
  return response;
}

export async function flushIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/flush`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_FLUSH_MANY : UIM_INDEX_FLUSH;
  uiMetricService.trackMetric('count', eventName);
  return response;
}

export async function forcemergeIndices(indices: string[], maxNumSegments: string) {
  const body = JSON.stringify({
    indices,
    maxNumSegments,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/forcemerge`, {
    body,
  });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_FORCE_MERGE_MANY : UIM_INDEX_FORCE_MERGE;
  uiMetricService.trackMetric('count', eventName);
  return response;
}

export async function clearCacheIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/clear_cache`, {
    body,
  });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_CLEAR_CACHE_MANY : UIM_INDEX_CLEAR_CACHE;
  uiMetricService.trackMetric('count', eventName);
  return response;
}
export async function freezeIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/freeze`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_FREEZE_MANY : UIM_INDEX_FREEZE;
  uiMetricService.trackMetric('count', eventName);
  return response;
}
export async function unfreezeIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/unfreeze`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_UNFREEZE_MANY : UIM_INDEX_UNFREEZE;
  uiMetricService.trackMetric('count', eventName);
  return response;
}

export async function loadIndexSettings(indexName: string) {
  const response = await httpService.httpClient.get(`${API_BASE_PATH}/settings/${indexName}`);
  return response;
}

export async function updateIndexSettings(indexName: string, body: object) {
  const response = await httpService.httpClient.put(`${API_BASE_PATH}/settings/${indexName}`, {
    body: JSON.stringify(body),
  });
  // Only track successful requests.
  uiMetricService.trackMetric('count', UIM_UPDATE_SETTINGS);
  return response;
}

export async function loadIndexStats(indexName: string) {
  const response = await httpService.httpClient.get(`${API_BASE_PATH}/stats/${indexName}`);
  return response;
}

export async function loadIndexMapping(indexName: string) {
  const response = await httpService.httpClient.get(`${API_BASE_PATH}/mapping/${indexName}`);
  return response;
}

export async function loadIndexData(type: string, indexName: string) {
  switch (type) {
    case TAB_MAPPING:
      return loadIndexMapping(indexName);

    case TAB_SETTINGS:
      return loadIndexSettings(indexName);

    case TAB_STATS:
      return loadIndexStats(indexName);
  }
}

export function loadIndexTemplates() {
  return useRequest({
    path: `${API_BASE_PATH}/templates`,
    method: 'get',
  });
}

export async function deleteTemplates(names: Array<Template['name']>) {
  const result = sendRequest({
    path: `${API_BASE_PATH}/templates/${names.map(name => encodeURIComponent(name)).join(',')}`,
    method: 'delete',
  });

  const uimActionType = names.length > 1 ? UIM_TEMPLATE_DELETE_MANY : UIM_TEMPLATE_DELETE;

  uiMetricService.trackMetric('count', uimActionType);

  return result;
}

export function loadIndexTemplate(name: Template['name']) {
  return useRequest({
    path: `${API_BASE_PATH}/templates/${encodeURIComponent(name)}`,
    method: 'get',
  });
}

export async function saveTemplate(template: Template, isClone?: boolean) {
  const result = await sendRequest({
    path: `${API_BASE_PATH}/templates`,
    method: 'put',
    body: JSON.stringify(template),
  });

  const uimActionType = isClone ? UIM_TEMPLATE_CLONE : UIM_TEMPLATE_CREATE;

  uiMetricService.trackMetric('count', uimActionType);

  return result;
}

export async function updateTemplate(template: Template) {
  const { name } = template;
  const result = await sendRequest({
    path: `${API_BASE_PATH}/templates/${encodeURIComponent(name)}`,
    method: 'put',
    body: JSON.stringify(template),
  });

  uiMetricService.trackMetric('count', UIM_TEMPLATE_UPDATE);

  return result;
}
