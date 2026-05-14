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
  buildSidebarConversationListRow,
  insertSidebarConversationListRow,
  removeSidebarConversationListRow,
  patchSidebarConversationListTitle,
  isServerBackedConversationListRow,
} from './conversation_sidebar_list_cache';

describe('conversation_sidebar_list_cache', () => {
  describe('isServerBackedConversationListRow', () => {
    it('is false for optimistic rows built for the sidebar cache', () => {
      const row = buildSidebarConversationListRow({
        id: '1',
        agent_id: 'a',
        title: 't',
      });
      expect(isServerBackedConversationListRow(row)).toBe(false);
    });

    it('is true for API list rows without _isOptimistic (even if username is empty)', () => {
      const row: ConversationWithoutRounds = {
        id: '1',
        agent_id: 'a',
        user: { id: '', username: '' },
        title: 't',
        created_at: '2020-01-01T00:00:00.000Z',
        updated_at: '2020-01-01T00:00:00.000Z',
      };
      expect(isServerBackedConversationListRow(row)).toBe(true);
    });

    it('is true when username is set', () => {
      const row: ConversationWithoutRounds = {
        id: '1',
        agent_id: 'a',
        user: { id: 'u', username: 'kim' },
        title: 't',
        created_at: '2020-01-01T00:00:00.000Z',
        updated_at: '2020-01-01T00:00:00.000Z',
      };
      expect(isServerBackedConversationListRow(row)).toBe(true);
    });
  });

  describe('insert / patch / remove', () => {
    it('insert prepends once; patch updates title; remove clears', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const agentId = 'ag';
      const listKey = queryKeys.conversations.byAgent(agentId);
      const row = buildSidebarConversationListRow({
        id: 'c1',
        agent_id: agentId,
        title: 'New conversation',
      });

      expect(await insertSidebarConversationListRow({ queryClient, agentId, row })).toBe(true);
      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)?.[0]).toMatchObject({
        _isOptimistic: true,
      });
      expect(await insertSidebarConversationListRow({ queryClient, agentId, row })).toBe(false);

      patchSidebarConversationListTitle({
        queryClient,
        agentId,
        conversationId: 'c1',
        title: 'Real',
      });
      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)?.[0].title).toBe(
        'Real'
      );

      removeSidebarConversationListRow({ queryClient, agentId, conversationId: 'c1' });
      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)).toEqual([]);
    });
  });
});
