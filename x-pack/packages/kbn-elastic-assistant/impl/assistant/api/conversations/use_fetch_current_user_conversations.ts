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
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../assistant_context/types';

export interface FetchConversationsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Conversation[];
}

export const useFetchCurrentUserConversations = (
  onFetch: (result: FetchConversationsResponse) => Record<string, Conversation>
) => {
  const { http } = useKibana<CoreStart>().services;
  const query = {
    page: 1,
    perPage: 100,
  };

  const cachingKeys = [
    ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS,
    query.page,
    query.perPage,
    ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ];
  const querySt = useQuery([cachingKeys, query], async () => {
    const res = await http.fetch<FetchConversationsResponse>(
      ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS,
      {
        method: 'GET',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        query,
      }
    );
    return onFetch(res);
  });

  return querySt;
};
