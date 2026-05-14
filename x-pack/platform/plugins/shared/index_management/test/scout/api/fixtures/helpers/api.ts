/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';

import { API_BASE_PATH, COMMON_HEADERS, INTERNAL_API_BASE_PATH } from '../constants';

export type Headers = Record<string, string>;

export const createHeaders = (...headers: Array<Headers | undefined>): Headers =>
  Object.assign({}, COMMON_HEADERS, ...headers);

export const indexManagementApi = (apiClient: ApiClientFixture, headers: Headers) => {
  const executeActionOnIndices = ({
    index,
    urlParam,
    args,
  }: {
    index?: string | string[];
    urlParam: string;
    args?: Record<string, unknown>;
  }) => {
    const indices = Array.isArray(index) ? index : [index];

    return apiClient.post(`${API_BASE_PATH}/indices/${urlParam}`, {
      headers,
      body: { indices, ...args },
    });
  };

  return {
    clusterNodes: {
      getPlugins: () => apiClient.get(`${API_BASE_PATH}/nodes/plugins`, { headers }),
    },
    componentTemplates: {
      create: (name: string, body: object) =>
        apiClient.post(`${API_BASE_PATH}/component_templates`, {
          headers,
          body: { name, ...body },
        }),
      getAll: () => apiClient.get(`${API_BASE_PATH}/component_templates`, { headers }),
      getOne: (name: string) =>
        apiClient.get(`${API_BASE_PATH}/component_templates/${name}`, { headers }),
      update: (name: string, body: object) =>
        apiClient.put(`${API_BASE_PATH}/component_templates/${name}`, {
          headers,
          body: { name, ...body },
        }),
      delete: (name: string) =>
        apiClient.delete(`${API_BASE_PATH}/component_templates/${name}`, { headers }),
      getDatastreams: (name: string) =>
        apiClient.get(`${API_BASE_PATH}/component_templates/${name}/datastreams`, { headers }),
    },
    dataStreams: {
      getAll: (includeStats = false) =>
        apiClient.get(`${API_BASE_PATH}/data_streams?includeStats=${includeStats}`, { headers }),
      getOne: (name: string, includeStats = false) =>
        apiClient.get(`${API_BASE_PATH}/data_streams/${name}?includeStats=${includeStats}`, {
          headers,
        }),
      updateRetention: (body: Record<string, unknown>) =>
        apiClient.put(`${API_BASE_PATH}/data_streams/data_retention`, {
          headers,
          body,
        }),
      updateFailureStore: (body: Record<string, unknown>) =>
        apiClient.put(`${API_BASE_PATH}/data_streams/configure_failure_store`, {
          headers,
          body,
        }),
      delete: (names: string[]) =>
        apiClient.post(`${API_BASE_PATH}/delete_data_streams`, {
          headers,
          body: { dataStreams: names },
        }),
      getMappingsFromTemplate: (name: string) =>
        apiClient.post(`${API_BASE_PATH}/data_streams/${name}/mappings_from_template`, { headers }),
      rollover: (name: string) =>
        apiClient.post(`${API_BASE_PATH}/data_streams/${name}/rollover`, { headers }),
    },
    enrichPolicies: {
      create: (policy: object) =>
        apiClient.post(`${INTERNAL_API_BASE_PATH}/enrich_policies`, {
          headers,
          body: { policy },
        }),
      getAll: () => apiClient.get(`${INTERNAL_API_BASE_PATH}/enrich_policies`, { headers }),
      execute: (name: string) =>
        apiClient.put(`${INTERNAL_API_BASE_PATH}/enrich_policies/${name}`, { headers }),
      delete: (name: string) =>
        apiClient.delete(`${INTERNAL_API_BASE_PATH}/enrich_policies/${name}`, { headers }),
      getFieldsFromIndices: (indices: string[]) =>
        apiClient.post(`${INTERNAL_API_BASE_PATH}/enrich_policies/get_fields_from_indices`, {
          headers,
          body: { indices },
        }),
      getMatchingDataStreams: (pattern: string) =>
        apiClient.post(`${INTERNAL_API_BASE_PATH}/enrich_policies/get_matching_data_streams`, {
          headers,
          body: { pattern },
        }),
      getMatchingIndices: (pattern: string) =>
        apiClient.post(`${INTERNAL_API_BASE_PATH}/enrich_policies/get_matching_indices`, {
          headers,
          body: { pattern },
        }),
    },
    indices: {
      clearCache: (index: string) => executeActionOnIndices({ index, urlParam: 'clear_cache' }),
      close: (index: string) => executeActionOnIndices({ index, urlParam: 'close' }),
      create: (indexName?: string, indexMode?: string) =>
        apiClient.put(`${INTERNAL_API_BASE_PATH}/indices/create`, {
          headers,
          body: { indexName, indexMode },
        }),
      delete: (index?: string | string[]) => executeActionOnIndices({ index, urlParam: 'delete' }),
      flush: (index: string) => executeActionOnIndices({ index, urlParam: 'flush' }),
      forceMerge: (index: string, maxNumSegments: number) =>
        executeActionOnIndices({ index, urlParam: 'forcemerge', args: { maxNumSegments } }),
      getDetails: (index: string) =>
        apiClient.get(`${INTERNAL_API_BASE_PATH}/indices/${index}`, { headers }),
      getDocCounts: (indexNames: string[]) =>
        apiClient.post(`${INTERNAL_API_BASE_PATH}/index_doc_count`, {
          headers,
          body: { indexNames },
        }),
      getStats: (index: string) => apiClient.get(`${API_BASE_PATH}/stats/${index}`, { headers }),
      list: () => apiClient.get(`${API_BASE_PATH}/indices`, { headers }),
      open: (index: string) => executeActionOnIndices({ index, urlParam: 'open' }),
      refresh: (index: string) => executeActionOnIndices({ index, urlParam: 'refresh' }),
      reload: (indexNames?: string[]) =>
        apiClient.post(`${API_BASE_PATH}/indices/reload`, { headers, body: { indexNames } }),
    },
    mappings: {
      get: (index: string) => apiClient.get(`${API_BASE_PATH}/mapping/${index}`, { headers }),
      update: (index: string, mappings: object) =>
        apiClient.put(`${API_BASE_PATH}/mapping/${index}`, { headers, body: mappings }),
    },
    settings: {
      get: (index: string) => apiClient.get(`${API_BASE_PATH}/settings/${index}`, { headers }),
      update: (index: string, settings: object) =>
        apiClient.put(`${API_BASE_PATH}/settings/${index}`, { headers, body: settings }),
    },
    templates: {
      create: (body: object) =>
        apiClient.post(`${API_BASE_PATH}/index_templates`, { headers, body }),
      delete: (templates: Array<{ name: string; isLegacy?: boolean }>) =>
        apiClient.post(`${API_BASE_PATH}/delete_index_templates`, { headers, body: { templates } }),
      getAll: () => apiClient.get(`${API_BASE_PATH}/index_templates`, { headers }),
      getOne: (name: string, isLegacy = false) =>
        apiClient.get(`${API_BASE_PATH}/index_templates/${name}?legacy=${isLegacy}`, { headers }),
      simulate: (body: object) =>
        apiClient.post(`${API_BASE_PATH}/index_templates/simulate`, { headers, body }),
      simulateByName: (name: string) =>
        apiClient.post(`${API_BASE_PATH}/index_templates/simulate/${name}`, { headers }),
      update: (name: string, body: object) =>
        apiClient.put(`${API_BASE_PATH}/index_templates/${name}`, { headers, body }),
    },
  };
};
