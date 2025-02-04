/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import type { SerializedEnrichPolicy } from '@kbn/index-management-shared-types';
import { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  API_BASE_PATH,
  INTERNAL_API_BASE_PATH,
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
  UIM_INDEX_OPEN,
  UIM_INDEX_OPEN_MANY,
  UIM_INDEX_REFRESH,
  UIM_INDEX_REFRESH_MANY,
  UIM_TEMPLATE_DELETE,
  UIM_TEMPLATE_DELETE_MANY,
  UIM_TEMPLATE_CREATE,
  UIM_TEMPLATE_UPDATE,
  UIM_TEMPLATE_CLONE,
  UIM_TEMPLATE_SIMULATE,
} from '../../../common/constants';
import {
  TemplateDeserialized,
  TemplateListItem,
  DataStream,
  Index,
  IndexSettingsResponse,
} from '../../../common';
import { useRequest, sendRequest } from './use_request';
import { httpService } from './http';
import { UiMetricService } from './ui_metric';
import type { FieldFromIndicesRequest } from '../../../common';
import { Fields } from '../components/mappings_editor/types';

interface ReloadIndicesOptions {
  asSystemRequest?: boolean;
}

// Temporary hack to provide the uiMetricService instance to this file.
// TODO: Refactor and export an ApiService instance through the app dependencies context
let uiMetricService: UiMetricService;
export const setUiMetricService = (_uiMetricService: UiMetricService) => {
  uiMetricService = _uiMetricService;
};
// End hack

export function useLoadDataStreams({ includeStats }: { includeStats: boolean }) {
  return useRequest<DataStream[]>({
    path: `${API_BASE_PATH}/data_streams`,
    method: 'get',
    query: {
      includeStats,
    },
  });
}

export function useLoadDataStream(name: string) {
  return useRequest<DataStream>({
    path: `${API_BASE_PATH}/data_streams/${encodeURIComponent(name)}`,
    method: 'get',
  });
}

export async function deleteDataStreams(dataStreams: string[]) {
  return sendRequest({
    path: `${API_BASE_PATH}/delete_data_streams`,
    method: 'post',
    body: { dataStreams },
  });
}

export async function updateDataRetention(
  dataStreams: string[],
  data: {
    dataRetention: string;
    timeUnit: string;
    infiniteRetentionPeriod: boolean;
    dataRetentionEnabled: boolean;
  }
) {
  let body;

  if (!data.dataRetentionEnabled) {
    body = { enabled: false, dataStreams };
  } else {
    body = data.infiniteRetentionPeriod
      ? { dataStreams }
      : { dataRetention: `${data.dataRetention}${data.timeUnit}`, dataStreams };
  }

  return sendRequest({
    path: `${API_BASE_PATH}/data_streams/data_retention`,
    method: 'put',
    body,
  });
}

export async function loadIndices() {
  const response = await httpService.httpClient.get<any>(`${API_BASE_PATH}/indices`);
  return response.data ? response.data : response;
}

export async function reloadIndices(
  indexNames: string[],
  { asSystemRequest }: ReloadIndicesOptions = {}
) {
  const body = JSON.stringify({
    indexNames,
  });
  const response = await httpService.httpClient.post<any>(`${API_BASE_PATH}/indices/reload`, {
    body,
    asSystemRequest,
  });
  return response.data ? response.data : response;
}

export async function closeIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/close`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_CLOSE_MANY : UIM_INDEX_CLOSE;
  uiMetricService.trackMetric(METRIC_TYPE.COUNT, eventName);
  return response;
}

export async function deleteIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/delete`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_DELETE_MANY : UIM_INDEX_DELETE;
  uiMetricService.trackMetric(METRIC_TYPE.COUNT, eventName);
  return response;
}

export async function openIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/open`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_OPEN_MANY : UIM_INDEX_OPEN;
  uiMetricService.trackMetric(METRIC_TYPE.COUNT, eventName);
  return response;
}

export async function refreshIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/refresh`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_REFRESH_MANY : UIM_INDEX_REFRESH;
  uiMetricService.trackMetric(METRIC_TYPE.COUNT, eventName);
  return response;
}

export async function flushIndices(indices: string[]) {
  const body = JSON.stringify({
    indices,
  });
  const response = await httpService.httpClient.post(`${API_BASE_PATH}/indices/flush`, { body });
  // Only track successful requests.
  const eventName = indices.length > 1 ? UIM_INDEX_FLUSH_MANY : UIM_INDEX_FLUSH;
  uiMetricService.trackMetric(METRIC_TYPE.COUNT, eventName);
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
  uiMetricService.trackMetric(METRIC_TYPE.COUNT, eventName);
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
  uiMetricService.trackMetric(METRIC_TYPE.COUNT, eventName);
  return response;
}

export async function loadIndexSettings(indexName: string) {
  const response = await httpService.httpClient.get(
    `${API_BASE_PATH}/settings/${encodeURIComponent(indexName)}`
  );
  return response;
}

export async function updateIndexSettings(indexName: string, body: object) {
  const response = await sendRequest({
    path: `${API_BASE_PATH}/settings/${encodeURIComponent(indexName)}`,
    method: 'put',
    body: JSON.stringify(body),
  });

  // Only track successful requests.
  if (!response.error) {
    uiMetricService.trackMetric(METRIC_TYPE.COUNT, UIM_UPDATE_SETTINGS);
  }

  return response;
}

export async function loadIndexStats(indexName: string) {
  const response = await httpService.httpClient.get(
    `${API_BASE_PATH}/stats/${encodeURIComponent(indexName)}`
  );
  return response;
}

export async function loadIndexMapping(indexName: string) {
  const response = await httpService.httpClient.get<MappingTypeMapping>(
    `${API_BASE_PATH}/mapping/${encodeURIComponent(indexName)}`
  );
  return response;
}

export function useLoadIndexTemplates() {
  return useRequest<{ templates: TemplateListItem[]; legacyTemplates: TemplateListItem[] }>({
    path: `${API_BASE_PATH}/index_templates`,
    method: 'get',
  });
}

export async function deleteTemplates(templates: Array<{ name: string; isLegacy?: boolean }>) {
  const result = sendRequest({
    path: `${API_BASE_PATH}/delete_index_templates`,
    method: 'post',
    body: { templates },
  });

  const uimActionType = templates.length > 1 ? UIM_TEMPLATE_DELETE_MANY : UIM_TEMPLATE_DELETE;

  uiMetricService.trackMetric(METRIC_TYPE.COUNT, uimActionType);

  return result;
}

export function useLoadIndexTemplate(name: TemplateDeserialized['name'], isLegacy?: boolean) {
  return useRequest<TemplateDeserialized>({
    path: `${API_BASE_PATH}/index_templates/${encodeURIComponent(name)}`,
    method: 'get',
    query: {
      legacy: isLegacy,
    },
  });
}

export async function saveTemplate(template: TemplateDeserialized, isClone?: boolean) {
  const result = await sendRequest({
    path: `${API_BASE_PATH}/index_templates`,
    method: 'post',
    body: JSON.stringify(template),
  });

  const uimActionType = isClone ? UIM_TEMPLATE_CLONE : UIM_TEMPLATE_CREATE;

  uiMetricService.trackMetric(METRIC_TYPE.COUNT, uimActionType);

  return result;
}

export async function updateTemplate(template: TemplateDeserialized) {
  const { name } = template;
  const result = await sendRequest({
    path: `${API_BASE_PATH}/index_templates/${encodeURIComponent(name)}`,
    method: 'put',
    body: JSON.stringify(template),
  });

  uiMetricService.trackMetric(METRIC_TYPE.COUNT, UIM_TEMPLATE_UPDATE);

  return result;
}

export function simulateIndexTemplate({
  template,
  templateName,
}: {
  template?: { [key: string]: any };
  templateName?: string;
}) {
  const path = templateName
    ? `${API_BASE_PATH}/index_templates/simulate/${templateName}`
    : `${API_BASE_PATH}/index_templates/simulate`;

  const body = templateName ? undefined : JSON.stringify(template);

  return sendRequest({
    path,
    method: 'post',
    body,
  }).then((result) => {
    uiMetricService.trackMetric(METRIC_TYPE.COUNT, UIM_TEMPLATE_SIMULATE);
    return result;
  });
}

export function useLoadNodesPlugins() {
  return useRequest<string[]>({
    path: `${API_BASE_PATH}/nodes/plugins`,
    method: 'get',
  });
}

export const useLoadEnrichPolicies = () => {
  return useRequest<SerializedEnrichPolicy[]>({
    path: `${INTERNAL_API_BASE_PATH}/enrich_policies`,
    method: 'get',
  });
};

export async function deleteEnrichPolicy(policyName: string) {
  const result = sendRequest({
    path: `${INTERNAL_API_BASE_PATH}/enrich_policies/${policyName}`,
    method: 'delete',
  });

  return result;
}

export async function executeEnrichPolicy(policyName: string) {
  const result = sendRequest({
    path: `${INTERNAL_API_BASE_PATH}/enrich_policies/${policyName}`,
    method: 'put',
  });

  return result;
}

export async function createEnrichPolicy(
  policy: SerializedEnrichPolicy,
  executePolicyAfterCreation?: boolean
) {
  const result = sendRequest({
    path: `${INTERNAL_API_BASE_PATH}/enrich_policies`,
    method: 'post',
    body: JSON.stringify({ policy }),
    query: {
      executePolicyAfterCreation,
    },
  });

  return result;
}

export async function getMatchingIndices(pattern: string) {
  const result = sendRequest({
    path: `${INTERNAL_API_BASE_PATH}/enrich_policies/get_matching_indices`,
    method: 'post',
    body: JSON.stringify({ pattern }),
  });

  return result;
}

export async function getMatchingDataStreams(pattern: string) {
  const result = sendRequest({
    path: `${INTERNAL_API_BASE_PATH}/enrich_policies/get_matching_data_streams`,
    method: 'post',
    body: JSON.stringify({ pattern }),
  });

  return result;
}

export async function getFieldsFromIndices(indices: string[]) {
  const result = sendRequest<FieldFromIndicesRequest>({
    path: `${INTERNAL_API_BASE_PATH}/enrich_policies/get_fields_from_indices`,
    method: 'post',
    body: JSON.stringify({ indices }),
  });

  return result;
}

export function loadIndex(indexName: string) {
  return sendRequest<Index>({
    path: `${INTERNAL_API_BASE_PATH}/indices/${encodeURIComponent(indexName)}`,
    method: 'get',
  });
}

export function useLoadIndexMappings(indexName: string) {
  return useRequest<MappingTypeMapping>({
    path: `${API_BASE_PATH}/mapping/${encodeURIComponent(indexName)}`,
    method: 'get',
  });
}

export function loadIndexStatistics(indexName: string) {
  return sendRequest<IndicesStatsResponse>({
    path: `${API_BASE_PATH}/stats/${encodeURIComponent(indexName)}`,
    method: 'get',
  });
}

export function useLoadIndexSettings(indexName: string) {
  return useRequest<IndexSettingsResponse>({
    path: `${API_BASE_PATH}/settings/${encodeURIComponent(indexName)}`,
    method: 'get',
  });
}

export function createIndex(indexName: string, indexMode: string) {
  return sendRequest({
    path: `${INTERNAL_API_BASE_PATH}/indices/create`,
    method: 'put',
    body: JSON.stringify({
      indexName,
      indexMode,
    }),
  });
}

export function updateIndexMappings(indexName: string, newFields: Fields) {
  return sendRequest({
    path: `${API_BASE_PATH}/mapping/${encodeURIComponent(indexName)}`,
    method: 'put',
    body: JSON.stringify({ ...newFields }),
  });
}

export function getInferenceEndpoints() {
  return sendRequest<InferenceAPIConfigResponse[]>({
    path: `${API_BASE_PATH}/inference/all`,
    method: 'get',
  });
}

export function useLoadInferenceEndpoints() {
  return useRequest<InferenceAPIConfigResponse[]>({
    path: `${API_BASE_PATH}/inference/all`,
    method: 'get',
  });
}
