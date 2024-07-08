/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindPromptsResponse } from '@kbn/elastic-assistant-common/impl/schemas/prompts/find_prompts_route.gen';
import { useQuery } from '@tanstack/react-query';
import { API_VERSIONS, ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND } from '@kbn/elastic-assistant-common';
import { HttpSetup, IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useAssistantContext } from '../../../assistant_context';

export interface UseFetchPromptsParams {
  signal?: AbortSignal | undefined;
  consumer?: string;
}

/**
 * API call for fetching prompts for current spaceId
 *
 * @param {Object} options - The options object.
 * @param {string} options.consumer - prompt consumer
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {useQuery} hook for getting the status of the prompts
 */

export const useFetchPrompts = (payload?: UseFetchPromptsParams) => {
  const {
    assistantAvailability: { isAssistantEnabled },
    http,
  } = useAssistantContext();

  const QUERY = {
    page: 1,
    per_page: 1000, // Continue use in-memory paging till the new design will be ready
    filter: `consumer:${payload?.consumer ?? '*'}`,
  };

  const CACHING_KEYS = [
    ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND,
    QUERY.page,
    QUERY.per_page,
    QUERY.filter,
    API_VERSIONS.internal.v1,
  ];

  return useQuery<FindPromptsResponse, unknown, FindPromptsResponse>(
    CACHING_KEYS,
    async () =>
      http.fetch(ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND, {
        method: 'GET',
        version: API_VERSIONS.internal.v1,
        query: QUERY,
        signal: payload?.signal,
      }),
    {
      initialData: {
        data: [],
        page: 1,
        perPage: 5,
        total: 0,
      },
      placeholderData: {
        data: [],
        page: 1,
        perPage: 5,
        total: 0,
      },
      keepPreviousData: true,
      enabled: isAssistantEnabled,
    }
  );
};

export const getPrompts = async ({
  http,
  signal,
  toasts,
}: {
  http: HttpSetup;
  toasts: IToasts;
  signal?: AbortSignal | undefined;
}) => {
  try {
    return await http.fetch<FindPromptsResponse>(ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND, {
      method: 'GET',
      version: API_VERSIONS.internal.v1,
      signal,
    });
  } catch (error) {
    toasts.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.prompts.getPromptsError', {
        defaultMessage: 'Error fetching prompts',
      }),
    });
    throw error;
  }
};
