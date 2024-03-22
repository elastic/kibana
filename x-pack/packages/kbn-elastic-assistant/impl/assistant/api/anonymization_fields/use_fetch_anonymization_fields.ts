/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { useQuery } from '@tanstack/react-query';
import {
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';

export interface UseFetchAnonymizationFieldsParams {
  http: HttpSetup;
  onFetch: (result: FindAnonymizationFieldsResponse) => Record<string, Anonymization>;
  signal?: AbortSignal | undefined;
}

/**
 * API call for fetching assistant conversations for the current user
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {Function} [options.onFetch] - transformation function for conversations fetch result
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {useQuery} hook for getting the status of the conversations
 */
export const useFetchCurrentUserConversations = ({
  http,
  onFetch,
  signal,
}: UseFetchAnonymizationFieldsParams) => {
  const query = {
    page: 1,
    perPage: 100,
  };

  const cachingKeys = [
    ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
    query.page,
    query.perPage,
    ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ];

  return useQuery([cachingKeys, query], async () => {
    const res = await http.fetch<FetchConversationsResponse>(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
      {
        method: 'GET',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        query,
        signal,
      }
    );
    return onFetch(res);
  });
};
