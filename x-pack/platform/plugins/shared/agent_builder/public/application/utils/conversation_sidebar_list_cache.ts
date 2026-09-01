/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfiniteData, QueryClient } from '@kbn/react-query';
import { MAX_CONVERSATIONS_PER_PAGE, MAX_RESULT_WINDOW } from '../../../common/constants';
import type {
  ListConversationsResponse,
  ListConversationsResponseItem,
} from '../../../common/http_api/conversations';
import type { ConversationsService } from '../../services/conversations/conversations_service';
import { queryKeys } from '../query_keys';

type ConversationListCache = InfiniteData<ListConversationsResponse>;

const unpinnedKey = (agentId: string) =>
  queryKeys.conversations.byAgent(agentId, { pinned: false });
const pinnedKey = (agentId: string) => queryKeys.conversations.byAgent(agentId, { pinned: true });

const getNextPageParam = (lastPage: ListConversationsResponse) => {
  const { page, per_page: pp, total } = lastPage.pagination;
  const next = page + 1;
  return page * pp < total && next * pp <= MAX_RESULT_WINDOW ? next : undefined;
};

const buildSidebarConversationListRow = (p: {
  id: string;
  agent_id: string;
  title: string;
}): ListConversationsResponseItem => {
  const t = new Date().toISOString();
  return {
    id: p.id,
    agent_id: p.agent_id,
    user: { id: '', username: '' },
    title: p.title,
    created_at: t,
    updated_at: t,
    permissions: { rename: true, delete: true, update_access_control: true },
  };
};

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
 * Prepend `row` to the first page of an infinite-query cache entry.
 * Checks ALL loaded pages for duplicates before inserting (not just the first).
 * Synthesises a minimal first page when the cache is empty so the row is
 * visible immediately even if a prefetch failed.
 * Returns true if the row was inserted, false if it was already present.
 */
const prependConversationToList = (
  queryClient: QueryClient,
  key: unknown[],
  row: ListConversationsResponseItem
): boolean => {
  let inserted = false;
  queryClient.setQueryData<ConversationListCache>(key, (prev) => {
    const data: ConversationListCache = prev ?? {
      pages: [
        { pagination: { total: 0, page: 1, per_page: MAX_CONVERSATIONS_PER_PAGE }, results: [] },
      ],
      pageParams: [undefined],
    };
    if (data.pages.some((p) => p.results.some((c) => c.id === row.id))) return prev;
    inserted = true;
    const [firstPage, ...rest] = data.pages;
    return {
      ...data,
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
  return inserted;
};

/**
 * Ensure the unpinned list for `agentId` is in the cache, then prepend a
 * newly created conversation row. New conversations are always unpinned, so
 * both the `pinned: false` cache variant (sidebar) and the `pinned: null`
 * variant (EmbeddableConversationList, which queries without a pinned filter)
 * need updating.
 */
export const insertSidebarConversationListRow = async ({
  queryClient,
  conversationsService,
  agentId,
  conversationId,
  title,
}: {
  queryClient: QueryClient;
  conversationsService: ConversationsService;
  agentId: string;
  conversationId: string;
  title: string;
}): Promise<boolean> => {
  const row = buildSidebarConversationListRow({ id: conversationId, agent_id: agentId, title });
  const key = unpinnedKey(agentId);
  // EmbeddableConversationList calls useConversationList({ agentId }) without a
  // pinned option, which resolves to pinned: null — a different React Query key
  // from pinned: false. Both need the new row.
  const allKey = queryKeys.conversations.byAgent(agentId);

  // Cold-cache warm-up: must use fetchInfiniteQuery so the stored shape is
  // { pages, pageParams } rather than a flat array.
  if (queryClient.getQueryData<ConversationListCache>(key) === undefined) {
    try {
      await queryClient.fetchInfiniteQuery({
        queryKey: key,
        queryFn: ({ pageParam }: { pageParam?: number }) =>
          conversationsService.list({ agentId, pinned: false, page: pageParam ?? 1 }),
        getNextPageParam,
      });
    } catch {
      // Proceed with the optimistic insert even if the prefetch fails; the next
      // explicit refresh of the sidebar will pick up the server state.
    }
  }

  await queryClient.cancelQueries({ queryKey: key });

  const inserted = prependConversationToList(queryClient, key, row);
  prependConversationToList(queryClient, allKey, row);

  return inserted;
};

/**
 * Remove a conversation from every paged list variant (pinned and unpinned).
 */
export const removeSidebarConversationListRow = ({
  queryClient,
  conversationId,
}: {
  queryClient: QueryClient;
  agentId: string; // kept for call-site compatibility; removal is prefix-wide
  conversationId: string;
}) => {
  applyToAllListVariants(
    queryClient,
    (results) => {
      const next = results.filter((c) => c.id !== conversationId);
      return next.length < results.length ? next : results;
    },
    -1
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
