/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { HttpHandler, IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
  FindSecurityAIPromptsRequestQuery,
  FindSecurityAIPromptsResponse,
} from '@kbn/elastic-assistant-common';

export interface UseFindPromptsParams {
  context: {
    isAssistantEnabled: boolean;
    httpFetch: HttpHandler;
    toasts?: IToasts;
  };
  signal?: AbortSignal | undefined;
  params: FindSecurityAIPromptsRequestQuery;
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

export const useFindPrompts = (payload: UseFindPromptsParams) => {
  const { isAssistantEnabled, httpFetch, toasts } = payload.context;

  const QUERY = {
    connector_id: payload.params.connector_id,
    prompt_ids: payload.params.prompt_ids,
    prompt_group_id: payload.params.prompt_group_id,
  };

  const CACHING_KEYS = [
    ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
    QUERY.connector_id,
    QUERY.prompt_ids,
    QUERY.prompt_group_id,
    API_VERSIONS.public.v1,
  ];

  return useQuery<FindSecurityAIPromptsResponse, unknown, FindSecurityAIPromptsResponse>(
    CACHING_KEYS,
    async () =>
      getPrompts({
        httpFetch,
        signal: payload.signal,
        toasts,
        query: QUERY,
      }),
    {
      initialData: {
        prompts: [],
      },
      placeholderData: {
        prompts: [],
      },
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      enabled: isAssistantEnabled,
    }
  );
};

const getPrompts = async ({
  httpFetch,
  signal,
  toasts,
  query,
}: {
  httpFetch: HttpHandler;
  toasts?: IToasts;
  signal?: AbortSignal | undefined;
  query: FindSecurityAIPromptsRequestQuery;
}) => {
  try {
    return await httpFetch<FindSecurityAIPromptsResponse>(
      ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND,
      {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        signal,
        query,
      }
    );
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.securityAiPrompts.getPromptsError', {
        defaultMessage: 'Error fetching Security AI Prompts',
      }),
    });
    throw error;
  }
};
