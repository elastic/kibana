/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { API_BASE_PATH, INTERNAL_API_BASE_PATH } from '../../../common/constants';

type HttpResponse = Record<string, any> | any[];
type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';

export interface ResponseError {
  statusCode: number;
  message: string | Error;
  attributes?: Record<string, any>;
}

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

  const mockResponse = (method: HttpMethod, path: string, response?: unknown, error?: unknown) => {
    const defuse = (promise: Promise<unknown>) => {
      promise.catch(() => {});
      return promise;
    };

    return mockResponses
      .get(method)!
      .set(path, error ? defuse(Promise.reject({ body: error })) : Promise.resolve(response));
  };

  const setLoadTemplatesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/index_templates`, response, error);

  const setLoadIndicesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/indices`, response, error);

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

  const setEditDataRetentionResponse = (
    dataStreamId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) =>
    mockResponse(
      'PUT',
      `${API_BASE_PATH}/data_streams/${encodeURIComponent(dataStreamId)}/data_retention`,
      response,
      error
    );

  const setDeleteTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/delete_index_templates`, response, error);

  const setLoadTemplateResponse = (
    templateId: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/index_templates/${templateId}`, response, error);

  const setCreateTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/index_templates`, response, error);

  const setLoadIndexSettingsResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/settings/${indexName}`, response, error);

  const setLoadIndexMappingResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/mapping/${indexName}`, response, error);

  const setLoadIndexStatsResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('GET', `${API_BASE_PATH}/stats/${indexName}`, response, error);

  const setUpdateIndexSettingsResponse = (
    indexName: string,
    response?: HttpResponse,
    error?: ResponseError
  ) => mockResponse('PUT', `${API_BASE_PATH}/settings/${indexName}`, response, error);

  const setSimulateTemplateResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${API_BASE_PATH}/index_templates/simulate`, response, error);

  const setLoadComponentTemplatesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/component_templates`, response, error);

  const setLoadNodesPluginsResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${API_BASE_PATH}/nodes/plugins`, response, error);

  const setLoadTelemetryResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', '/api/ui_counters/_report', response, error);

  const setLoadEnrichPoliciesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${INTERNAL_API_BASE_PATH}/enrich_policies`, response, error);

  const setGetMatchingIndices = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse(
      'POST',
      `${INTERNAL_API_BASE_PATH}/enrich_policies/get_matching_indices`,
      response,
      error
    );

  const setGetFieldsFromIndices = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse(
      'POST',
      `${INTERNAL_API_BASE_PATH}/enrich_policies/get_fields_from_indices`,
      response,
      error
    );

  const setGetPrivilegesResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('GET', `${INTERNAL_API_BASE_PATH}/enrich_policies/privileges`, response, error);

  const setCreateEnrichPolicy = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('POST', `${INTERNAL_API_BASE_PATH}/enrich_policies`, response, error);

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

  const setCreateIndexResponse = (response?: HttpResponse, error?: ResponseError) =>
    mockResponse('PUT', `${INTERNAL_API_BASE_PATH}/indices/create`, response, error);

  return {
    setLoadTemplatesResponse,
    setLoadIndicesResponse,
    setReloadIndicesResponse,
    setLoadDataStreamsResponse,
    setLoadDataStreamResponse,
    setDeleteDataStreamResponse,
    setDeleteTemplateResponse,
    setEditDataRetentionResponse,
    setLoadTemplateResponse,
    setCreateTemplateResponse,
    setLoadIndexSettingsResponse,
    setLoadIndexMappingResponse,
    setLoadIndexStatsResponse,
    setUpdateIndexSettingsResponse,
    setSimulateTemplateResponse,
    setLoadComponentTemplatesResponse,
    setLoadNodesPluginsResponse,
    setLoadTelemetryResponse,
    setLoadEnrichPoliciesResponse,
    setDeleteEnrichPolicyResponse,
    setExecuteEnrichPolicyResponse,
    setLoadIndexDetailsResponse,
    setCreateIndexResponse,
    setGetMatchingIndices,
    setGetFieldsFromIndices,
    setGetPrivilegesResponse,
    setCreateEnrichPolicy,
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
