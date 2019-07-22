/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import {
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
} from '../../common/constants';

import { TAB_SETTINGS, TAB_MAPPING, TAB_STATS } from '../constants';

import { trackUiMetric } from './track_ui_metric';
import { useRequest, sendRequest } from './use_request';
import { Template } from '../../common/types';

let httpClient: ng.IHttpService;

export const setHttpClient = (client: ng.IHttpService) => {
  httpClient = client;
};

export const getHttpClient = () => {
  return httpClient;
};

const apiPrefix = chrome.addBasePath('/api/index_management');

export async function loadIndices() {
  const response = await httpClient.get(`${apiPrefix}/indices`);
  return response.data;
}

export async function reloadIndices(indexNames: string[]) {
  const body = {
    indexNames,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/reload`, body);
  return response.data;
}

export async function closeIndices(indices: string[]) {
  const body = {
    indices,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/close`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_CLOSE_MANY : UIM_INDEX_CLOSE;
  trackUiMetric(actionType);
  return response.data;
}

export async function deleteIndices(indices: string[]) {
  const body = {
    indices,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/delete`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_DELETE_MANY : UIM_INDEX_DELETE;
  trackUiMetric(actionType);
  return response.data;
}

export async function openIndices(indices: string[]) {
  const body = {
    indices,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/open`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_OPEN_MANY : UIM_INDEX_OPEN;
  trackUiMetric(actionType);
  return response.data;
}

export async function refreshIndices(indices: string[]) {
  const body = {
    indices,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/refresh`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_REFRESH_MANY : UIM_INDEX_REFRESH;
  trackUiMetric(actionType);
  return response.data;
}

export async function flushIndices(indices: string[]) {
  const body = {
    indices,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/flush`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_FLUSH_MANY : UIM_INDEX_FLUSH;
  trackUiMetric(actionType);
  return response.data;
}

export async function forcemergeIndices(indices: string[], maxNumSegments: string) {
  const body = {
    indices,
    maxNumSegments,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/forcemerge`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_FORCE_MERGE_MANY : UIM_INDEX_FORCE_MERGE;
  trackUiMetric(actionType);
  return response.data;
}

export async function clearCacheIndices(indices: string[]) {
  const body = {
    indices,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/clear_cache`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_CLEAR_CACHE_MANY : UIM_INDEX_CLEAR_CACHE;
  trackUiMetric(actionType);
  return response.data;
}
export async function freezeIndices(indices: string[]) {
  const body = {
    indices,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/freeze`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_FREEZE_MANY : UIM_INDEX_FREEZE;
  trackUiMetric(actionType);
  return response.data;
}
export async function unfreezeIndices(indices: string[]) {
  const body = {
    indices,
  };
  const response = await httpClient.post(`${apiPrefix}/indices/unfreeze`, body);
  // Only track successful requests.
  const actionType = indices.length > 1 ? UIM_INDEX_UNFREEZE_MANY : UIM_INDEX_UNFREEZE;
  trackUiMetric(actionType);
  return response.data;
}

export async function loadIndexSettings(indexName: string) {
  const response = await httpClient.get(`${apiPrefix}/settings/${indexName}`);
  return response.data;
}

export async function updateIndexSettings(indexName: string, settings: object) {
  const response = await httpClient.put(`${apiPrefix}/settings/${indexName}`, settings);
  // Only track successful requests.
  trackUiMetric(UIM_UPDATE_SETTINGS);
  return response;
}

export async function loadIndexStats(indexName: string) {
  const response = await httpClient.get(`${apiPrefix}/stats/${indexName}`);
  return response.data;
}

export async function loadIndexMapping(indexName: string) {
  const response = await httpClient.get(`${apiPrefix}/mapping/${indexName}`);
  return response.data;
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
    path: `${apiPrefix}/templates`,
    method: 'get',
  });
}

export const deleteTemplates = async (names: Array<Template['name']>) => {
  const uimActionType = names.length > 1 ? UIM_TEMPLATE_DELETE_MANY : UIM_TEMPLATE_DELETE;

  return sendRequest({
    path: `${apiPrefix}/templates/${names.map(name => encodeURIComponent(name)).join(',')}`,
    method: 'delete',
    uimActionType,
  });
};
