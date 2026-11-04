/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfiniteData, QueryClient } from '@kbn/react-query';
import type {
  ListConversationsResponse,
  ListConversationsResponseItem,
} from '../../../common/http_api/conversations';
import { queryKeys } from '../query_keys';

type ConversationListCache = InfiniteData<ListConversationsResponse>;

const unpinnedKey = (agentId: string) =>
  queryKeys.conversations.byAgent(agentId, { pinned: false });
const pinnedKey = (agentId: string) => queryKeys.conversations.byAgent(agentId, { pinned: true });

/**
 * Walk every paged list variant whose key starts with queryKeys.conversations.list and apply
 * `updater` to each page's `results` array. Updates `pagination.total` by `delta`.
 */
const applyToAllListVariants = (
  queryClient: QueryClient,
  updater: (results: ListConversationsResponseItem[]) => ListConversationsResponseItem[],
  delta: number = 0
) => {
  queryClient.setQueriesData<ConversationListCache>(
    { queryKey: queryKeys.conversations.list },
    (prev) => {
      if (!prev) return prev;
      const newPages = prev.pages.map((page) => {
        const newResults = updater(page.results);
        // Only apply delta when results actually changed; otherwise a delete in
        // the unpinned list would also decrement the pinned list's total.
        if (newResults === page.results) return page;
        return {
          ...page,
          pagination: { ...page.pagination, total: Math.max(0, page.pagination.total + delta) },
          results: newResults,
        };
      });
      const pagesChanged = newPages.some((p, i) => p !== prev.pages[i]);
      return pagesChanged ? { ...prev, pages: newPages } : prev;
    }
  );
};

/**
 * Update a conversation's fields in every paged list variant.
 */
export const patchConversationList = ({
  queryClient,
  conversationId,
  values,
}: {
  queryClient: QueryClient;
  agentId: string; // kept for call-site compatibility; patching is prefix-wide
  conversationId: string;
  values: Partial<ListConversationsResponseItem>;
}) => {
  applyToAllListVariants(queryClient, (results) => {
    let changed = false;
    const next = results.map((c) => {
      if (c.id !== conversationId) return c;
      const hasChanges = (Object.keys(values) as Array<keyof ListConversationsResponseItem>).some(
        (k) => values[k] !== c[k]
      );
      if (!hasChanges) return c;
      changed = true;
      return { ...c, ...values };
    });
    return changed ? next : results;
  });
};

/**
 * Move a conversation between the pinned and unpinned list caches.
 * Called optimistically when the user pins or unpins a conversation.
 */
export const movePinnedConversationBetweenLists = ({
  queryClient,
  agentId,
  conversationId,
  pinned,
}: {
  queryClient: QueryClient;
  agentId: string;
  conversationId: string;
  /** The new pinned state. */
  pinned: boolean;
}) => {
  const sourceKey = pinned ? unpinnedKey(agentId) : pinnedKey(agentId);
  const targetKey = pinned ? pinnedKey(agentId) : unpinnedKey(agentId);

  let movedRow: ListConversationsResponseItem | undefined;

  // Remove from source list.
  queryClient.setQueryData<ConversationListCache>(sourceKey, (prev) => {
    if (!prev) return prev;
    const newPages = prev.pages.map((page) => {
      const idx = page.results.findIndex((c) => c.id === conversationId);
      if (idx === -1) return page;
      movedRow = page.results[idx];
      return {
        ...page,
        pagination: { ...page.pagination, total: Math.max(0, page.pagination.total - 1) },
        results: [...page.results.slice(0, idx), ...page.results.slice(idx + 1)],
      };
    });
    const pagesChanged = newPages.some((p, i) => p !== prev.pages[i]);
    return pagesChanged ? { ...prev, pages: newPages } : prev;
  });

  if (!movedRow) {
    // The conversation wasn't in any loaded page (it's on a page not yet
    // fetched). Invalidate both lists so the server state is re-fetched on the
    // next render rather than leaving the view permanently stale.
    queryClient.invalidateQueries({ queryKey: sourceKey });
    queryClient.invalidateQueries({ queryKey: targetKey });
    return;
  }
  const row = { ...movedRow, pinned };

  // Prepend to the first page of the target list, if it's cached.
  queryClient.setQueryData<ConversationListCache>(targetKey, (prev) => {
    if (!prev) return prev;
    const [firstPage, ...rest] = prev.pages;
    return {
      ...prev,
      pages: [
        {
          ...firstPage,
          pagination: { ...firstPage.pagination, total: firstPage.pagination.total + 1 },
          results: [row, ...firstPage.results],
        },
        ...rest,
      ],
    };
  });
};
