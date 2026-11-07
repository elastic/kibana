/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  ListConversationsResponse,
  ListConversationsResponseItem,
} from '@kbn/agent-builder-plugin/common/http_api/conversations';
import { useKibana } from '../../../common/lib/kibana';

export type FoundConversation = ListConversationsResponseItem;

const LIST_URL = '/api/agent_builder/conversations';
const LIST_API_VERSION = '2023-10-31';
const SEARCH_URL = '/internal/agent_builder/conversations/_search';

export interface UseFindConversationsArgs {
  /** Raw search input; an empty string lists conversations by last updated instead. */
  query: string;
  agentId?: string;
  /** Zero-based page index, matching `EuiTablePagination`. */
  page: number;
  perPage: number;
}

/**
 * Lists the current user's conversations, newest first, or searches them by
 * title when `query` is set (the search route rejects a blank query).
 */
export const useFindConversations = ({
  query,
  agentId,
  page,
  perPage,
}: UseFindConversationsArgs) => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, isError, refetch } = useQuery<ListConversationsResponse, Error>(
    ['cases', 'attach-conversation', { query, agentId, page, perPage }],
    ({ signal }) => {
      const paging = {
        page: page + 1,
        per_page: perPage,
        ...(agentId ? { agent_id: agentId } : {}),
      };
      return query
        ? http.get<ListConversationsResponse>(SEARCH_URL, { query: { ...paging, query }, signal })
        : http.get<ListConversationsResponse>(LIST_URL, {
            version: LIST_API_VERSION,
            query: { ...paging, sort_order: 'desc' },
            signal,
          });
    },
    { keepPreviousData: true }
  );

  const total = data?.pagination.total ?? 0;
  return {
    items: data?.results ?? [],
    total,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
    isLoading,
    isError,
    refetch,
  };
};
