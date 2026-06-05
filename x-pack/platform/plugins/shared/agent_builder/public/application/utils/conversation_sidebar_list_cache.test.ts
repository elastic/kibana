/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import { QueryClient } from '@kbn/react-query';

import { queryKeys } from '../query_keys';
import {
  insertSidebarConversationListRow,
  patchConversationList,
  removeSidebarConversationListRow,
} from './conversation_sidebar_list_cache';

const buildRow = (id: string, agent_id = 'ag', title = 't'): ConversationWithoutRounds => ({
  id,
  agent_id,
  user: { id: 'u', username: 'kim' },
  title,
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2020-01-01T00:00:00.000Z',
});

describe('conversation_sidebar_list_cache', () => {
  const agentId = 'ag';
  const listKey = queryKeys.conversations.byAgent(agentId);

  describe('insertSidebarConversationListRow', () => {
    it('prepends a new row and returns true', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

      const inserted = await insertSidebarConversationListRow({
        queryClient,
        agentId,
        conversationId: 'c1',
        title: 'New conversation',
      });

      expect(inserted).toBe(true);
      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)?.[0]).toMatchObject({
        id: 'c1',
        title: 'New conversation',
      });
    });

    it('does not duplicate an existing row and returns false', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationWithoutRounds[]>(listKey, [buildRow('c1')]);

      const inserted = await insertSidebarConversationListRow({
        queryClient,
        agentId,
        conversationId: 'c1',
        title: 'placeholder',
      });

      expect(inserted).toBe(false);
      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)).toHaveLength(1);
    });
  });

  describe('removeSidebarConversationListRow', () => {
    it('removes the matching row by id', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationWithoutRounds[]>(listKey, [
        buildRow('c1'),
        buildRow('c2'),
      ]);

      removeSidebarConversationListRow({ queryClient, agentId, conversationId: 'c1' });

      expect(
        queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)?.map((c) => c.id)
      ).toEqual(['c2']);
    });

    it('is a no-op when the cache is empty', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      removeSidebarConversationListRow({ queryClient, agentId, conversationId: 'c1' });
      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)).toBeUndefined();
    });
  });

  describe('patchConversationList', () => {
    it('updates the title of the matching row, leaves other rows alone', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationWithoutRounds[]>(listKey, [
        buildRow('A', agentId, 'placeholder'),
        buildRow('B', agentId, 'unrelated'),
      ]);

      patchConversationList({
        queryClient,
        agentId,
        conversationId: 'A',
        values: { title: 'Real title from server' },
      });

      const result = queryClient.getQueryData<ConversationWithoutRounds[]>(listKey);
      expect(result?.find((c) => c.id === 'A')?.title).toBe('Real title from server');
      expect(result?.find((c) => c.id === 'B')?.title).toBe('unrelated');
    });

    it('is a no-op when the conversation is not in the list (preserves reference)', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationWithoutRounds[]>(listKey, [buildRow('A')]);
      const before = queryClient.getQueryData<ConversationWithoutRounds[]>(listKey);

      patchConversationList({
        queryClient,
        agentId,
        conversationId: 'C',
        values: { title: 'whatever' },
      });

      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)).toBe(before);
    });

    it('is a no-op when the props are already up to date (preserves reference)', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData<ConversationWithoutRounds[]>(listKey, [
        buildRow('A', agentId, 'already-final'),
      ]);
      const before = queryClient.getQueryData<ConversationWithoutRounds[]>(listKey);

      patchConversationList({
        queryClient,
        agentId,
        conversationId: 'A',
        values: { title: 'already-final' },
      });

      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)).toBe(before);
    });

    it('is a no-op when the list cache is empty / undefined', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      patchConversationList({
        queryClient,
        agentId,
        conversationId: 'A',
        values: { title: 'whatever' },
      });
      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)).toBeUndefined();
    });
  });
});
