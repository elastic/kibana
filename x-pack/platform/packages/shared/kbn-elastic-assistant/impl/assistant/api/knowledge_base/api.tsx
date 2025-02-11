/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  CreateKnowledgeBaseRequestParams,
  CreateKnowledgeBaseResponse,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL,
  GetKnowledgeBaseIndicesResponse,
  ReadKnowledgeBaseRequestParams,
  ReadKnowledgeBaseResponse,
} from '@kbn/elastic-assistant-common';
import { HttpSetup, IHttpFetchError } from '@kbn/core-http-browser';

/**
 * API call for getting the status of the Knowledge Base. Provide
 * a resource to include the status of that specific resource.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.resource] - Resource to get the status of, otherwise status of overall KB
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<ReadKnowledgeBaseResponse | IHttpFetchError>}
 */
export const getKnowledgeBaseStatus = async ({
  http,
  resource,
  signal,
}: ReadKnowledgeBaseRequestParams & { http: HttpSetup; signal?: AbortSignal | undefined }): Promise<
  ReadKnowledgeBaseResponse | IHttpFetchError
> => {
  try {
    const path = ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL.replace('{resource?}', resource || '');
    const response = await http.fetch(path, {
      method: 'GET',
      signal,
      version: API_VERSIONS.public.v1,
    });

    return response as ReadKnowledgeBaseResponse;
  } catch (error) {
    return error as IHttpFetchError;
  }
};

/**
 * API call for setting up the Knowledge Base. Provide a resource to set up a specific resource.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} [options.resource] - Resource to be added to the KB, otherwise sets up the base KB
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<CreateKnowledgeBaseResponse>}
 */
export const postKnowledgeBase = async ({
  http,
  resource,
  signal,
}: CreateKnowledgeBaseRequestParams & {
  http: HttpSetup;
  signal?: AbortSignal | undefined;
}): Promise<CreateKnowledgeBaseResponse> => {
  const path = ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL.replace('{resource?}', resource || '');
  const response = await http.fetch(path, {
    method: 'POST',
    signal,
    version: API_VERSIONS.public.v1,
  });

  return response as CreateKnowledgeBaseResponse;
};

/**
 * API call for getting indices that have fields of `semantic_text` type.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<GetKnowledgeBaseIndicesResponse | IHttpFetchError>}
 */
export const getKnowledgeBaseIndices = async ({
  http,
  signal,
}: {
  http: HttpSetup;
  signal?: AbortSignal | undefined;
}): Promise<GetKnowledgeBaseIndicesResponse | IHttpFetchError> => {
  try {
    const response = await http.fetch(ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL, {
      method: 'GET',
      signal,
      version: API_VERSIONS.internal.v1,
    });

    return response as GetKnowledgeBaseIndicesResponse;
  } catch (error) {
    return error as IHttpFetchError;
  }
};
