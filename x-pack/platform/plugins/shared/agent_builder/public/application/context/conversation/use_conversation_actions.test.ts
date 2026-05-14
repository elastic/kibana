/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import { QueryClient } from '@kbn/react-query';

import type { ConversationsService } from '../../../services/conversations';
import { queryKeys } from '../../query_keys';
import { createNewConversation } from '../../utils/new_conversation';
import { createConversationActions } from './use_conversation_actions';

const conversationsServiceStub = {
  delete: jest.fn(),
  rename: jest.fn(),
} as unknown as ConversationsService;

describe('createConversationActions', () => {
  describe('onConversationCreated', () => {
    it('updates per-conversation cache and matching list row title (search-team#14321)', () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const agentId = 'agent-flow';
      const conversationId = 'conv-flow-1';
      const listKey = queryKeys.conversations.byAgent(agentId);
      const byIdKey = queryKeys.conversations.byId(conversationId);

      const conv = createNewConversation({ id: conversationId, agentId });
      conv.title = 'New conversation';
      queryClient.setQueryData<Conversation>(byIdKey, conv);

      queryClient.setQueryData<ConversationWithoutRounds[]>(listKey, [
        {
          id: conversationId,
          agent_id: agentId,
          user: { id: '', username: '' },
          title: 'New conversation',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]);

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const actions = createConversationActions({
        conversationId,
        queryClient,
        conversationsService: conversationsServiceStub,
      });

      actions.onConversationCreated({ title: 'LLM-generated title' });

      expect(queryClient.getQueryData<Conversation>(byIdKey)?.title).toBe('LLM-generated title');
      expect(queryClient.getQueryData<ConversationWithoutRounds[]>(listKey)?.[0].title).toBe(
        'LLM-generated title'
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.conversations.all });

      invalidateSpy.mockRestore();
    });
  });
});
