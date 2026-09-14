/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useInfiniteQuery } from '@kbn/react-query';
import { MAX_RESULT_WINDOW } from '../../../common/constants';
import type { ListConversationsResponseItem } from '../../../common/http_api/conversations';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

const DEFAULT_CONVERSATIONS_PAGE_SIZE = 50;

/**
 * Deduplicates an array of conversations by id, keeping the first occurrence.
 * Offset pagination can return a duplicate if a document's sort position shifts
 * between two page fetches; keeping the lower-page copy is the safe tie-break.
 */
const dedupeById = (
  conversations: ListConversationsResponseItem[]
): ListConversationsResponseItem[] => {
  const seen = new Set<string>();
  return conversations.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
};

export const useConversationList = ({
  agentId,
  pinned,
  perPage,
}: {
  agentId?: string;
  pinned?: boolean;
  perPage?: number;
} = {}) => {
  const { conversationsService } = useAgentBuilderServices();

  const queryKey = agentId
    ? queryKeys.conversations.byAgent(agentId, { pinned })
    : queryKeys.conversations.all;

  const {
    data,
    isLoading,
    refetch: refresh,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    // React Query v4: first call receives `pageParam: undefined`; default inside queryFn.
    queryFn: ({ pageParam }: { pageParam?: number }) =>
      conversationsService.list({
        agentId,
        pinned,
        page: pageParam ?? 1,
        perPage: perPage ?? DEFAULT_CONVERSATIONS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      const { page, per_page: pp, total } = lastPage.pagination;
      const next = page + 1;
      // No more pages if we've fetched all results, or the next offset would exceed the ES window.
      return page * pp < total && next * pp <= MAX_RESULT_WINDOW ? next : undefined;
    },
  });

  const conversations = useMemo(
    () => dedupeById(data?.pages.flatMap((p) => p.results) ?? []),
    [data]
  );
  const total = data?.pages[0]?.pagination.total ?? 0;

  return {
    conversations,
    total,
    isLoading,
    refresh,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
};
