/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
// import { AI_ASSISTANT_API_CURRENT_VERSION } from '../common/constants';
import { Conversation } from '../../assistant_context/types';

export interface FetchConversationsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Conversation[];
}

export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_KEY = 'elastic_assistant_conversations';

const AI_ASSISTANT_API_CURRENT_VERSION = '2023-10-31';
const ELASTIC_AI_ASSISTANT_URL = '/api/elastic_assistant' as const;
const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL = `${ELASTIC_AI_ASSISTANT_URL}/conversations` as const;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND =
  `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/_find_user` as const;

export const useFetchCurrentUserConversations = () => {
  const { http } = useKibana<CoreStart>().services;
  const query = {
    page: 1,
    perPage: 100,
  };

  const querySt = useQuery([ELASTIC_AI_ASSISTANT_CONVERSATIONS_KEY, query], () =>
    http.fetch<FetchConversationsResponse>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, {
      method: 'GET',
      version: AI_ASSISTANT_API_CURRENT_VERSION,
      query,
    })
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
  const path = `/api/elastic_assistant/conversations/_last_user`;
  const { http } = useKibana<CoreStart>().services;

  const querySt = useQuery([path], () =>
    http.fetch<Conversation>(path, {
      method: 'GET',
      version: AI_ASSISTANT_API_CURRENT_VERSION,
    })
  );

  return { ...querySt };
};
