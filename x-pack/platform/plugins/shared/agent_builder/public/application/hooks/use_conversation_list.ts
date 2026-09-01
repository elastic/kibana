/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useInfiniteQuery } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import { dedupeById, getNextConversationPageParam } from '../utils/conversation_pagination';
import { useAgentBuilderServices } from './use_agent_builder_service';

const DEFAULT_CONVERSATIONS_PAGE_SIZE = 50;

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
    getNextPageParam: getNextConversationPageParam,
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
