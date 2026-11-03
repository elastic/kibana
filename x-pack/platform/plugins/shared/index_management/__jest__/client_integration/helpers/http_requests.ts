/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions } from '@kbn/core/public';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { API_BASE_PATH, INTERNAL_API_BASE_PATH } from '../../../common/constants';

type HttpResponse = unknown;
type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';

export interface ResponseError {
  statusCode: number;
  message: string | Error;
  attributes?: Record<string, unknown>;
}

/** Kibana path of an Elasticsearch request sent through the es_client plugin. */
export const esClientPath = (esPath: string) =>
  `/internal/es_client/${esPath.split('/').map(encodeURIComponent).join('/')}`;

/** Rejection of a failed es_client request, carrying an Elasticsearch error body. */
const toEsFetchError = ({ statusCode, message }: ResponseError) =>
  Object.assign(new Error(String(message)), {
    name: 'HttpFetchError',
    request: {},
    response: { status: statusCode, statusText: 'Error' },
    body: { error: { type: 'exception', reason: String(message) }, status: statusCode },
  });

const toEsqlDocCountResponse = (counts: Record<string, number> = {}) => ({
  columns: [
    { name: 'count()', type: 'long' },
    { name: '_index', type: 'keyword' },
  ],
  values: Object.entries(counts).map(([indexName, count]) => [count, indexName]),
});

// Register helpers to mock HTTP Requests
const registerHttpRequestMockHelpers = (
  httpSetup: ReturnType<typeof httpServiceMock.createStartContract>,
  shouldDelayResponse: () => boolean
) => {
  const mockResponses = new Map<HttpMethod, Map<string, Promise<unknown>>>(
    ['GET', 'PUT', 'DELETE', 'POST'].map(
      (method) => [method, new Map()] as [HttpMethod, Map<string, Promise<unknown>>]
    )
  );

  const mockMethodImplementation = (method: HttpMethod, path: string) => {
    const responsePromise = mockResponses.get(method)?.get(path) ?? Promise.resolve({});
    if (shouldDelayResponse()) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(responsePromise), 1000);
      });
    }

    return responsePromise;
  };

  httpSetup.get.mockImplementation((path) =>
    mockMethodImplementation('GET', path as unknown as string)
  );
  httpSetup.delete.mockImplementation((path) =>
    mockMethodImplementation('DELETE', path as unknown as string)
  );
  httpSetup.post.mockImplementation((path) =>
    mockMethodImplementation('POST', path as unknown as string)
  );
  httpSetup.put.mockImplementation((path) =>
    mockMethodImplementation('PUT', path as unknown as string)
  );
  httpSetup.fetch.mockImplementation(((path: string, options?: HttpFetchOptions) =>
    mockMethodImplementation(
      (options?.method ?? 'GET') as HttpMethod,
      path
    )) as unknown as typeof httpSetup.fetch);

  const defuse = (promise: Promise<unknown>) => {
    promise.catch(() => {});
    return promise;
  };

  const mockResponse = (method: HttpMethod, path: string, response?: unknown, error?: unknown) =>
    mockResponses
      .get(method)!
      .set(path, error ? defuse(Promise.reject({ body: error })) : Promise.resolve(response));

  /** Mocks an Elasticsearch request sent through the es_client plugin. */
  const mockEsResponse = (
    method: HttpMethod,
    esPath: string,
    response?: unknown,
    error?: ResponseError
  ) =>
    mockResponses
      .get(method)!
      .set(
        esClientPath(esPath),
        error ? defuse(Promise.reject(toEsFetchError(error))) : Promise.resolve(response)
      );

  const setLoadTemplatesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/index_templates`, response, error);

  const setLoadIndicesStatsResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockEsResponse('GET', '*/_stats/docs,store', response, error);

  /**
   * The indices list endpoint switched from returning an array (`/indices`) to returning
   * a record keyed by index name (`/indices_get`). Most tests still pass an array, so we
   * normalize here and mock both endpoints for compatibility.
   */
  const setLoadIndicesResponse = (response?: HttpResponse, error?: ResponseError) => {
    const normalizedIndicesGetResponse = (() => {
      if (!response) return response;
      if (Array.isArray(response)) {
        return response.reduce<Record<string, unknown>>((acc, index: any) => {
          if (index?.name) acc[index.name] = index;
          return acc;
        }, {});
      }
      return response;
    })();

    // New endpoint (record keyed by index name)
    mockResponse('GET', `${API_BASE_PATH}/indices_get`, normalizedIndicesGetResponse, error);

    // Legacy endpoint (array) - keep for older consumers/tests
    const legacyResponse = Array.isArray(response)
      ? response
      : response && typeof response === 'object'
      ? Object.values(response as Record<string, unknown>)
      : response;
    mockResponse('GET', `${API_BASE_PATH}/indices`, legacyResponse, error);
  };

  const setReloadIndicesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/indices/reload`, response, error);

  const setLoadDataStreamsResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/data_streams`, response, error);

  const setLoadDataStreamResponse = (
    dataStreamId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'GET',
      `${API_BASE_PATH}/data_streams/${encodeURIComponent(dataStreamId)}`,
      response,
      error
    );

  const setDeleteDataStreamResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/delete_data_streams`, response, error);

  const setEditDataRetentionResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('PUT', `${API_BASE_PATH}/data_streams/data_retention`, response, error);

  const setDataStreamsDataLifecycleResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('PUT', `${API_BASE_PATH}/data_streams/data_lifecycle`, response, error);

  const setConfigureFailureStoreResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('PUT', `${API_BASE_PATH}/data_streams/configure_failure_store`, response, error);

  const setLoadDataStreamsIlmPoliciesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/data_streams/ilm_policies`, response, error);

  const setDeleteTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/delete_index_templates`, response, error);

  const setLoadTemplateResponse = (
    templateId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/index_templates/${templateId}`, response, error);

  const setCreateTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/index_templates`, response, error);

  /** `response` is the `{ settings, defaults }` object for the index. */
  const setLoadIndexSettingsResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockEsResponse('GET', `${indexName}/_settings`, { [indexName]: response }, error);

  /** `response` is the `{ mappings }` object for the index. */
  const setLoadIndexMappingResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockEsResponse('GET', `${indexName}/_mapping`, { [indexName]: response }, error);

  const setUpdateIndexMappingsResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockEsResponse('PUT', `${indexName}/_mapping`, response, error);

  /** `response` is the `{ _shards, stats }` object for the index. */
  const setLoadIndexStatsResponse = (
    indexName: string,
    response?: { _shards?: unknown; stats?: unknown },
    error?: ResponseError
  ) =>
    mockEsResponse(
      'GET',
      `${indexName}/_stats`,
      { _shards: response?._shards, indices: { [indexName]: response?.stats } },
      error
    );

  const setUpdateIndexSettingsResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('PUT', `${API_BASE_PATH}/settings/${indexName}`, response, error);

  const setSimulateTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/index_templates/simulate`, response, error);

  const setSimulateTemplateByNameResponse = (
    name: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('POST', `${API_BASE_PATH}/index_templates/simulate/${name}`, response, error);

  const setLoadComponentTemplatesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/component_templates`, response, error);

  const setLoadSnapshotRepositoriesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/snapshot_repositories`, response, error);

  const setLoadNodesPluginsResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/nodes/plugins`, response, error);

  const setLoadTelemetryResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', '/api/ui_counters/_report', response, error);

  const setLoadEnrichPoliciesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${INTERNAL_API_BASE_PATH}/enrich_policies`, response, error);

  const setDeleteEnrichPolicyResponse = (
    policyName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'DELETE',
      `${INTERNAL_API_BASE_PATH}/enrich_policies/${policyName}`,
      response,
      error
    );

  const setExecuteEnrichPolicyResponse = (
    policyName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse('PUT', `${INTERNAL_API_BASE_PATH}/enrich_policies/${policyName}`, response, error);

  const setLoadIndexDetailsResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${INTERNAL_API_BASE_PATH}/indices/${indexName}`, response, error);

  const setCreateIndexResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockEsResponse('PUT', indexName, response, error);

  const setInferenceModels = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/inference/all`, response, error);

  const setUserStartPrivilegesResponse = (
    indexName: string,
    response?: {
      privileges: { canManageIndex: boolean; canDeleteDocuments?: boolean };
    },
    error?: ResponseError
  ) =>
    mockEsResponse(
      'POST',
      '_security/user/_has_privileges',
      {
        index: {
          [indexName]: {
            manage: response?.privileges.canManageIndex ?? false,
            delete: response?.privileges.canDeleteDocuments ?? false,
          },
        },
      },
      error
    );

  const setLoadIndexDocumentsSampleResponse = (
    indexName: string,
    response?: { results: unknown[] },
    error?: ResponseError
  ) =>
    mockEsResponse(
      'POST',
      `${indexName}/_search`,
      { hits: { hits: response?.results ?? [] } },
      error
    );

  /** `response` maps index names to their document counts. */
  const setLoadIndexDocCountResponse = (response?: Record<string, number>, error?: ResponseError) =>
    mockEsResponse('POST', '_query', toEsqlDocCountResponse(response), error);

  setLoadIndexDocCountResponse({});

  return {
    setLoadTemplatesResponse,
    setLoadIndicesStatsResponse,
    setLoadIndicesResponse,
    setReloadIndicesResponse,
    setLoadDataStreamsResponse,
    setLoadDataStreamResponse,
    setDeleteDataStreamResponse,
    setDeleteTemplateResponse,
    setEditDataRetentionResponse,
    setDataStreamsDataLifecycleResponse,
    setConfigureFailureStoreResponse,
    setLoadDataStreamsIlmPoliciesResponse,
    setLoadTemplateResponse,
    setCreateTemplateResponse,
    setLoadIndexSettingsResponse,
    setLoadIndexMappingResponse,
    setUpdateIndexMappingsResponse,
    setLoadIndexStatsResponse,
    setUpdateIndexSettingsResponse,
    setSimulateTemplateResponse,
    setSimulateTemplateByNameResponse,
    setLoadComponentTemplatesResponse,
    setLoadSnapshotRepositoriesResponse,
    setLoadNodesPluginsResponse,
    setLoadTelemetryResponse,
    setLoadEnrichPoliciesResponse,
    setDeleteEnrichPolicyResponse,
    setExecuteEnrichPolicyResponse,
    setLoadIndexDetailsResponse,
    setCreateIndexResponse,
    setInferenceModels,
    setUserStartPrivilegesResponse,
    setLoadIndexDocumentsSampleResponse,
    setLoadIndexDocCountResponse,
  };
};

export const init = () => {
  let isResponseDelayed = false;
  const getDelayResponse = () => isResponseDelayed;
  const setDelayResponse = (shouldDelayResponse: boolean) => {
    isResponseDelayed = shouldDelayResponse;
  };

  const httpSetup = httpServiceMock.createSetupContract();
  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(httpSetup, getDelayResponse);

  return {
    httpSetup,
    httpRequestsMockHelpers,
    setDelayResponse,
  };
};
