/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { useQuery } from '@tanstack/react-query';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../assistant_context/types';

export interface FetchConversationsResponse {
  page: number;
  per_page: number;
  total: number;
  data: Conversation[];
}

export interface UseFetchCurrentUserConversationsParams {
  http: HttpSetup;
  page?: number;
  perPage?: number;
  onFetch: (result: FetchConversationsResponse) => Record<string, Conversation>;
  signal?: AbortSignal | undefined;
  refetchOnWindowFocus?: boolean;
  isAssistantEnabled: boolean;
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
const query = {
  page: 1,
  per_page: 99,
  fields: ['id', 'title', 'apiConfig', 'updatedAt'],
};

export const useFetchCurrentUserConversations = ({
  http,
  onFetch,
  page,
  perPage,
  signal,
  refetchOnWindowFocus = true,
  isAssistantEnabled,
}: UseFetchCurrentUserConversationsParams) =>
  useQuery(
    [
      ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
      page ?? query.page,
      perPage ?? query.per_page,
      API_VERSIONS.public.v1,
    ],
    async () =>
      http.fetch<FetchConversationsResponse>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          ...query,
          page: page ?? query.page,
          per_page: perPage ?? query.per_page,
        },
        signal,
      }),
    {
      select: (data) => onFetch(data),
      keepPreviousData: true,
      initialData: { ...query, total: 0, data: [] },
      refetchOnWindowFocus,
      enabled: isAssistantEnabled,
    }
  );
