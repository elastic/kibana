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
import { mergeBaseWithPersistedConversations } from '../../helpers';
import { Conversation } from '../../../assistant_context/types';

export interface FetchConversationsResponse {
  page: number;
  per_page: number;
  total: number;
  data: Conversation[];
}

export interface UseFetchCurrentUserConversationsParams {
  http: HttpSetup;
  baseConversations?: Record<string, Conversation>;
  signal?: AbortSignal | undefined;
  refetchOnWindowFocus?: boolean;
  isAssistantEnabled: boolean;
  fields?: string[];
  filter?: string;
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
  // TODO optimize with pagination
  // https://github.com/elastic/kibana/issues/192714
  per_page: 5000,
  // ensure default conversations are fetched first to avoid recreating them
  sort_field: 'is_default',
  sort_order: 'desc',
};

export const CONVERSATIONS_QUERY_KEYS = [ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND];

export const useFetchCurrentUserConversations = ({
  http,
  baseConversations = {},
  signal,
  refetchOnWindowFocus = true,
  isAssistantEnabled,
  // defaults to only return these fields to keep conversations object small
  // will fill in mock data for the other fields ie: `messages: []`
  // when you need the full conversation object, call the getConversation api
  fields = ['title', 'is_default', 'updated_at', 'api_config'],
  filter,
}: UseFetchCurrentUserConversationsParams) =>
  useQuery(
    fields && fields.length ? [...CONVERSATIONS_QUERY_KEYS, fields] : CONVERSATIONS_QUERY_KEYS,
    async () =>
      http.fetch<FetchConversationsResponse>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          ...query,
          ...(fields && fields.length ? { fields } : {}),
          ...(filter && filter.length ? { filter } : {}),
        },
        signal,
      }),
    {
      select: (data) => mergeBaseWithPersistedConversations(baseConversations, data),
      keepPreviousData: true,
      initialData: { ...query, total: 0, data: [] },
      refetchOnWindowFocus,
      enabled: isAssistantEnabled,
    }
  );
