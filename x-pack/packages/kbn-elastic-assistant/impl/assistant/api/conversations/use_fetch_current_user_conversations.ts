/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS,
  ELASTIC_AI_ASSISTANT_CURRENT_USER_CONVERSATIONS_LAST,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../assistant_context/types';

export interface FetchConversationsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Conversation[];
}

export const useFetchCurrentUserConversations = () => {
  const { http } = useKibana<CoreStart>().services;
  const query = {
    page: 1,
    perPage: 100,
  };

  const querySt = useQuery(
    [ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS, query],
    () =>
      http.fetch<FetchConversationsResponse>(
        ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS,
        {
          method: 'GET',
          version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
          query,
        }
      )
  );

  return { ...querySt };
};

/**
 * API call for getting conversation by id.
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {string} options.id - Conversation id.
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {Promise<Conversation | IHttpFetchError>}
 */
export const useLastConversation = () => {
  const { http } = useKibana<CoreStart>().services;

  const querySt = useQuery([ELASTIC_AI_ASSISTANT_CURRENT_USER_CONVERSATIONS_LAST], () =>
    http.fetch<Conversation>(ELASTIC_AI_ASSISTANT_CURRENT_USER_CONVERSATIONS_LAST, {
      method: 'GET',
      version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
    })
  );

  return { ...querySt };
};
