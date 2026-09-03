/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useInfiniteQuery } from '@kbn/react-query';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { i18n } from '@kbn/i18n';
import { queryKeys } from '../query_keys';
import { dedupeById, getNextConversationPageParam } from '../utils/conversation_pagination';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useKibana } from './use_kibana';

const DEFAULT_CONVERSATIONS_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_PAGE_SIZE = 25;

const searchErrorToastTitle = i18n.translate('xpack.agentBuilder.conversationSearch.errorTitle', {
  defaultMessage: 'Unable to search conversations',
});

export const useConversationList = ({
  agentId,
  pinned,
  perPage,
  query,
}: {
  agentId?: string;
  pinned?: boolean;
  perPage?: number;
  /**
   * When provided, the hook switches into server-side search mode (debounced, relevance-ranked).
   * An empty or whitespace-only string keeps the hook in list mode with no extra request.
   */
  query?: string;
} = {}) => {
  const { services } = useKibana();
  const { conversationsService } = useAgentBuilderServices();

  // --- search mode -------------------------------------------------------
  const debouncedQuery = useDebouncedValue(query ?? '', SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const isSearching = trimmedQuery.length > 0;

  const {
    data: searchData,
    isLoading: searchIsLoading,
    isError,
    error,
    hasNextPage: searchHasNextPage,
    fetchNextPage: searchFetchNextPage,
    isFetchingNextPage: searchIsFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.conversations.search(trimmedQuery, { agentId }),
    // React Query v4: first call receives `pageParam: undefined`; default inside queryFn.
    queryFn: ({ pageParam }: { pageParam?: number }) =>
      conversationsService.search({
        query: trimmedQuery,
        agentId,
        page: pageParam ?? 1,
        perPage: SEARCH_PAGE_SIZE,
      }),
    getNextPageParam: getNextConversationPageParam,
    enabled: isSearching,
    // Avoids `conversations` flashing empty on every debounce tick mid-keystroke.
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!isError || searchIsLoading) return;
    services.notifications.toasts.addError(
      error instanceof Error ? error : new Error(formatAgentBuilderErrorMessage(error)),
      { title: searchErrorToastTitle }
    );
  }, [isError, searchIsLoading, error, services.notifications.toasts]);

  // --- list mode ---------------------------------------------------------
  const listQueryKey = agentId
    ? queryKeys.conversations.byAgent(agentId, { pinned })
    : queryKeys.conversations.all;

  const {
    data: listData,
    isLoading: listIsLoading,
    refetch: refresh,
    hasNextPage: listHasNextPage,
    fetchNextPage: listFetchNextPage,
    isFetchingNextPage: listIsFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: listQueryKey,
    queryFn: ({ pageParam }: { pageParam?: number }) =>
      conversationsService.list({
        agentId,
        pinned,
        page: pageParam ?? 1,
        perPage: perPage ?? DEFAULT_CONVERSATIONS_PAGE_SIZE,
      }),
    getNextPageParam: getNextConversationPageParam,
  });

  // --- unified output ----------------------------------------------------
  const data = isSearching ? searchData : listData;
  const conversations = useMemo(
    () => dedupeById(data?.pages.flatMap((p) => p.results) ?? []),
    [data]
  );
  const total = data?.pages[0]?.pagination.total ?? 0;

  return {
    conversations,
    total,
    isLoading: isSearching ? searchIsLoading : listIsLoading,
    isSearching,
    refresh,
    hasNextPage: isSearching ? searchHasNextPage : listHasNextPage,
    fetchNextPage: isSearching ? searchFetchNextPage : listFetchNextPage,
    isFetchingNextPage: isSearching ? searchIsFetchingNextPage : listIsFetchingNextPage,
  };
};
