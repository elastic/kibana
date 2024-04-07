/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { useQuery } from '@tanstack/react-query';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../assistant_context/types';

export interface FetchConversationsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Conversation[];
}

export interface UseFetchCurrentUserConversationsParams {
  http: HttpSetup;
  onFetch: (result: FetchConversationsResponse) => Record<string, Conversation>;
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
}: UseFetchCurrentUserConversationsParams) => {
  const query = {
    page: 1,
    perPage: 100,
  };

  const cachingKeys = [
    ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
    query.page,
    query.perPage,
    ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ];

  return useQuery(
    [cachingKeys, query],
    async () =>
      http.fetch<FetchConversationsResponse>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, {
        method: 'GET',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        query,
        signal,
      }),
    {
      select: (data) => onFetch(data),
      keepPreviousData: true,
      initialData: { page: 1, perPage: 100, total: 0, data: [] },
    }
  );
};
