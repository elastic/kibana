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

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_PAGE_SIZE = 25;

const conversationSearchErrorToastTitle = i18n.translate(
  'xpack.agentBuilder.conversationSearch.errorTitle',
  { defaultMessage: 'Unable to search conversations' }
);

/**
 * Server-side title search across all of a user's conversations, not just the pages
 * already cached by `useConversationList`. Debounces keystrokes and keeps the previous
 * page of results visible while the next one loads.
 */
export const useConversationSearch = ({ query, agentId }: { query: string; agentId?: string }) => {
  const { services } = useKibana();
  const { conversationsService } = useAgentBuilderServices();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();

  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
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
      enabled: trimmedQuery.length > 0,
      // Avoids `conversations` flashing empty on every debounce tick mid-keystroke.
      keepPreviousData: true,
    });

  useEffect(() => {
    if (!isError || isLoading) {
      return;
    }
    const err = error;
    services.notifications.toasts.addError(
      err instanceof Error ? err : new Error(formatAgentBuilderErrorMessage(err)),
      {
        title: conversationSearchErrorToastTitle,
      }
    );
  }, [isError, isLoading, error, services.notifications.toasts]);

  const conversations = useMemo(
    () => dedupeById(data?.pages.flatMap((p) => p.results) ?? []),
    [data]
  );
  const total = data?.pages[0]?.pagination.total ?? 0;

  return {
    conversations,
    total,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
};
