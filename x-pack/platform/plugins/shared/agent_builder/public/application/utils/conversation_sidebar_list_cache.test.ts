/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfiniteData } from '@kbn/react-query';
import { QueryClient } from '@kbn/react-query';

import type {
  ListConversationsResponse,
  ListConversationsResponseItem,
} from '../../../common/http_api/conversations';
import type { ConversationsService } from '../../services/conversations/conversations_service';
import { queryKeys } from '../query_keys';
import {
  insertSidebarConversationListRow,
  movePinnedConversationBetweenLists,
  patchConversationList,
  removeSidebarConversationListRow,
} from './conversation_sidebar_list_cache';

type ConversationListCache = InfiniteData<ListConversationsResponse>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildItem = (
  id: string,
  agentId = 'ag',
  title = 't',
  extra: Partial<ListConversationsResponseItem> = {}
): ListConversationsResponseItem => ({
  id,
  agent_id: agentId,
  user: { id: 'u', username: 'kim' },
  title,
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2020-01-01T00:00:00.000Z',
  permissions: { rename: true, delete: true, update_access_control: true },
  ...extra,
});

const buildPage = (
  items: ListConversationsResponseItem[],
  page = 1,
  total?: number
): ListConversationsResponse => ({
  pagination: { total: total ?? items.length, page, per_page: 50 },
  results: items,
});

/** Wrap one or more pages in the InfiniteData envelope React Query uses. */
const buildCache = (...pages: ListConversationsResponse[]): ConversationListCache => ({
  pages,
  pageParams: pages.map((_, i) => (i === 0 ? undefined : i + 1)),
});

const buildConversationsService = (response?: ListConversationsResponse) =>
  ({
    list: jest.fn().mockResolvedValue(response ?? buildPage([])),
  } as unknown as ConversationsService);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('conversation_sidebar_list_cache', () => {
  const agentId = 'ag';
  const unpinnedKey = queryKeys.conversations.byAgent(agentId, { pinned: false });
  const pinnedKey = queryKeys.conversations.byAgent(agentId, { pinned: true });
  // EmbeddableConversationList queries without a pinned filter → pinned: null key.
  const allKey = queryKeys.conversations.byAgent(agentId);

  // -------------------------------------------------------------------------
  describe('insertSidebarConversationListRow', () => {
    it('prefetches the server list when the cache is empty, then prepends', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const existing = [buildItem('existing-1'), buildItem('existing-2')];
      const conversationsService = buildConversationsService(buildPage(existing, 1, 2));

      const inserted = await insertSidebarConversationListRow({
        queryClient,
        conversationsService,
        agentId,
        conversationId: 'c1',
        title: 'New conversation',
      });

      expect(inserted).toBe(true);
      // Service is called with the correct params for page 1 of the unpinned list.
      expect(conversationsService.list).toHaveBeenCalledWith({ agentId, pinned: false, page: 1 });
      const cached = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(cached?.pages[0].results.map((c) => c.id)).toEqual(['c1', 'existing-1', 'existing-2']);
      // total is bumped
      expect(cached?.pages[0].pagination.total).toBe(3);
    });

    it('prefetch stores data in InfiniteData shape (pages / pageParams), not a flat array', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const conversationsService = buildConversationsService(buildPage([buildItem('e1')]));

      await insertSidebarConversationListRow({
        queryClient,
        conversationsService,
        agentId,
        conversationId: 'c1',
        title: 'New',
      });

      const cached = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(Array.isArray(cached)).toBe(false);
      expect(cached).toHaveProperty('pages');
      expect(cached).toHaveProperty('pageParams');
    });

    it('does not prefetch when the cache already has data', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('existing-1')]))
      );
      const conversationsService = buildConversationsService();

      const inserted = await insertSidebarConversationListRow({
        queryClient,
        conversationsService,
        agentId,
        conversationId: 'c1',
        title: 'New conversation',
      });

      expect(inserted).toBe(true);
      expect(conversationsService.list).not.toHaveBeenCalled();
      const cached = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(cached?.pages[0].results.map((c) => c.id)).toEqual(['c1', 'existing-1']);
    });

    it('does not duplicate an existing row and returns false', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c1')]))
      );
      const conversationsService = buildConversationsService();

      const inserted = await insertSidebarConversationListRow({
        queryClient,
        conversationsService,
        agentId,
        conversationId: 'c1',
        title: 'placeholder',
      });

      expect(inserted).toBe(false);
      const cached = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(cached?.pages[0].results).toHaveLength(1);
    });

    it('still inserts when the prefetch fails', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const conversationsService = {
        list: jest.fn().mockRejectedValue(new Error('network')),
      } as unknown as ConversationsService;

      const inserted = await insertSidebarConversationListRow({
        queryClient,
        conversationsService,
        agentId,
        conversationId: 'c1',
        title: 'New conversation',
      });

      expect(inserted).toBe(true);
      const cached = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(cached?.pages[0].results.map((c) => c.id)).toEqual(['c1']);
    });

    it('also inserts into the pinned:null (all-conversations) cache used by EmbeddableConversationList', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      // Seed the all-conversations (pinned:null) cache that the embeddable uses.
      queryClient.setQueryData<ConversationListCache>(
        allKey,
        buildCache(buildPage([buildItem('existing-1')], 1, 1))
      );
      // Also seed the unpinned cache so no prefetch is triggered.
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('existing-1')], 1, 1))
      );
      const conversationsService = buildConversationsService();

      await insertSidebarConversationListRow({
        queryClient,
        conversationsService,
        agentId,
        conversationId: 'c-new',
        title: 'New',
      });

      const cachedAll = queryClient.getQueryData<ConversationListCache>(allKey);
      expect(cachedAll?.pages[0].results.map((c) => c.id)).toContain('c-new');
      expect(cachedAll?.pages[0].pagination.total).toBe(2);
    });

    it('does not duplicate a row that already exists on a later loaded page', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      // c1 is on page 2; page 1 only contains c2.
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c2')], 1, 2), buildPage([buildItem('c1')], 2, 2))
      );
      const conversationsService = buildConversationsService();

      const inserted = await insertSidebarConversationListRow({
        queryClient,
        conversationsService,
        agentId,
        conversationId: 'c1',
        title: 'placeholder',
      });

      expect(inserted).toBe(false);
      const cached = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      // c1 must not appear in page 1.
      expect(cached?.pages[0].results.map((c) => c.id)).not.toContain('c1');
      // total must not be incremented.
      expect(cached?.pages[0].pagination.total).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  describe('removeSidebarConversationListRow', () => {
    it('removes the matching row by id and decrements total', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c1'), buildItem('c2')], 1, 2))
      );

      removeSidebarConversationListRow({ queryClient, agentId, conversationId: 'c1' });

      const cached = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(cached?.pages[0].results.map((c) => c.id)).toEqual(['c2']);
      expect(cached?.pages[0].pagination.total).toBe(1);
    });

    it('applies to all list variants under the prefix', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      // Populate both pinned and unpinned caches.
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c1'), buildItem('c2')], 1, 2))
      );
      queryClient.setQueryData<ConversationListCache>(
        pinnedKey,
        buildCache(buildPage([buildItem('c1', agentId, 't', { pinned: true })], 1, 1))
      );

      removeSidebarConversationListRow({ queryClient, agentId, conversationId: 'c1' });

      const unpinned = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(unpinned?.pages[0].results.map((c) => c.id)).toEqual(['c2']);
      const pinned = queryClient.getQueryData<ConversationListCache>(pinnedKey);
      expect(pinned?.pages[0].results).toHaveLength(0);
    });

    it('is a no-op when the cache is empty', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      removeSidebarConversationListRow({ queryClient, agentId, conversationId: 'c1' });
      expect(queryClient.getQueryData<ConversationListCache>(unpinnedKey)).toBeUndefined();
    });

    it('only decrements total in the list variant that actually contained the deleted row', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      // c1 and c2 are unpinned; the pinned list contains a different conversation (c3).
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c1'), buildItem('c2')], 1, 2))
      );
      queryClient.setQueryData<ConversationListCache>(
        pinnedKey,
        buildCache(buildPage([buildItem('c3', agentId, 't', { pinned: true })], 1, 1))
      );

      removeSidebarConversationListRow({ queryClient, agentId, conversationId: 'c1' });

      const unpinned = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(unpinned?.pages[0].results.map((c) => c.id)).toEqual(['c2']);
      expect(unpinned?.pages[0].pagination.total).toBe(1); // correctly decremented

      const pinned = queryClient.getQueryData<ConversationListCache>(pinnedKey);
      expect(pinned?.pages[0].results.map((c) => c.id)).toEqual(['c3']); // unchanged
      // Must NOT be decremented — c1 was never in the pinned list.
      expect(pinned?.pages[0].pagination.total).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('patchConversationList', () => {
    it('updates the title of the matching row, leaves other rows alone', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(
          buildPage([buildItem('A', agentId, 'placeholder'), buildItem('B', agentId, 'unrelated')])
        )
      );

      patchConversationList({
        queryClient,
        agentId,
        conversationId: 'A',
        values: { title: 'Real title from server' },
      });

      const cached = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(cached?.pages[0].results.find((c) => c.id === 'A')?.title).toBe(
        'Real title from server'
      );
      expect(cached?.pages[0].results.find((c) => c.id === 'B')?.title).toBe('unrelated');
    });

    it('is a no-op when the conversation is not in the list cache (preserves reference)', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('A')]))
      );
      const before = queryClient.getQueryData<ConversationListCache>(unpinnedKey);

      patchConversationList({ queryClient, agentId, conversationId: 'C', values: { title: 'x' } });

      expect(queryClient.getQueryData<ConversationListCache>(unpinnedKey)).toBe(before);
    });

    it('is a no-op when the props are already up to date (preserves reference)', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('A', agentId, 'already-final')]))
      );
      const before = queryClient.getQueryData<ConversationListCache>(unpinnedKey);

      patchConversationList({
        queryClient,
        agentId,
        conversationId: 'A',
        values: { title: 'already-final' },
      });

      expect(queryClient.getQueryData<ConversationListCache>(unpinnedKey)).toBe(before);
    });

    it('is a no-op when the list cache is empty / undefined', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      patchConversationList({
        queryClient,
        agentId,
        conversationId: 'A',
        values: { title: 'whatever' },
      });
      expect(queryClient.getQueryData<ConversationListCache>(unpinnedKey)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  describe('movePinnedConversationBetweenLists', () => {
    it('moves a row from the unpinned list to the pinned list', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c1'), buildItem('c2')], 1, 2))
      );
      queryClient.setQueryData<ConversationListCache>(pinnedKey, buildCache(buildPage([], 1, 0)));

      movePinnedConversationBetweenLists({
        queryClient,
        agentId,
        conversationId: 'c1',
        pinned: true,
      });

      const unpinned = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(unpinned?.pages[0].results.map((c) => c.id)).toEqual(['c2']);
      expect(unpinned?.pages[0].pagination.total).toBe(1);

      const pinned = queryClient.getQueryData<ConversationListCache>(pinnedKey);
      expect(pinned?.pages[0].results.map((c) => c.id)).toEqual(['c1']);
      expect(pinned?.pages[0].results[0].pinned).toBe(true);
      expect(pinned?.pages[0].pagination.total).toBe(1);
    });

    it('moves a row from the pinned list to the unpinned list', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        pinnedKey,
        buildCache(buildPage([buildItem('c1', agentId, 't', { pinned: true })], 1, 1))
      );
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c2')], 1, 1))
      );

      movePinnedConversationBetweenLists({
        queryClient,
        agentId,
        conversationId: 'c1',
        pinned: false,
      });

      const pinned = queryClient.getQueryData<ConversationListCache>(pinnedKey);
      expect(pinned?.pages[0].results).toHaveLength(0);
      expect(pinned?.pages[0].pagination.total).toBe(0);

      const unpinned = queryClient.getQueryData<ConversationListCache>(unpinnedKey);
      expect(unpinned?.pages[0].results.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(unpinned?.pages[0].results[0].pinned).toBe(false);
      expect(unpinned?.pages[0].pagination.total).toBe(2);
    });

    it('is a no-op on the target when the source conversation is not found', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c2')], 1, 1))
      );
      const initialPinnedCache = buildCache(buildPage([], 1, 0));
      queryClient.setQueryData<ConversationListCache>(pinnedKey, initialPinnedCache);

      movePinnedConversationBetweenLists({
        queryClient,
        agentId,
        conversationId: 'not-there',
        pinned: true,
      });

      // Target list data must be untouched (invalidateQueries only marks stale,
      // it does not remove or overwrite stored data).
      expect(queryClient.getQueryData<ConversationListCache>(pinnedKey)).toBe(initialPinnedCache);
    });

    it('invalidates both lists when the conversation is not in any loaded page', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      // 60 total conversations but only page 1 (50 items) is loaded; c-offpage is on page 2.
      queryClient.setQueryData<ConversationListCache>(
        unpinnedKey,
        buildCache(buildPage([buildItem('c2')], 1, 60))
      );
      queryClient.setQueryData<ConversationListCache>(pinnedKey, buildCache(buildPage([], 1, 0)));

      movePinnedConversationBetweenLists({
        queryClient,
        agentId,
        conversationId: 'c-offpage',
        pinned: true,
      });

      expect(queryClient.getQueryState(unpinnedKey)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(pinnedKey)?.isInvalidated).toBe(true);
    });

    it('preserves the source cache reference when no page was modified', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const sourceCache = buildCache(buildPage([buildItem('c2')], 1, 60));
      queryClient.setQueryData<ConversationListCache>(unpinnedKey, sourceCache);

      movePinnedConversationBetweenLists({
        queryClient,
        agentId,
        conversationId: 'c-offpage', // not in any loaded page
        pinned: true,
      });

      // The updater must return the original `prev` reference, not a new object.
      expect(queryClient.getQueryData<ConversationListCache>(unpinnedKey)).toBe(sourceCache);
    });
  });
});
