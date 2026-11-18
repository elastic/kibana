/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { InfiniteData } from '@kbn/react-query';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import type {
  ListConversationsResponse,
  ListConversationsResponseItem,
} from '../../../common/http_api/conversations';
import { queryKeys } from '../query_keys';
import { useConversationListMutations } from './use_conversation_list_mutations';

const mockUpdatePinnedStatus = jest.fn();

jest.mock('./use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    conversationsService: { updatePinnedStatus: mockUpdatePinnedStatus },
  }),
}));

jest.mock('./use_navigation', () => ({
  useNavigation: () => ({ navigateToAgentBuilderUrl: jest.fn() }),
}));

jest.mock('./use_toasts', () => ({
  useToasts: () => ({ addErrorToast: jest.fn() }),
}));

type ConversationListCache = InfiniteData<ListConversationsResponse>;

const createListCache = (results: ListConversationsResponseItem[]): ConversationListCache => ({
  pages: [{ results, pagination: { total: results.length, page: 1, per_page: 50 } }],
  pageParams: [undefined],
});

describe('useConversationListMutations', () => {
  beforeEach(() => {
    mockUpdatePinnedStatus.mockReset().mockResolvedValue(undefined);
  });

  it.each([true, false])(
    'preserves cached timestamps when optimistically setting pinned to %s',
    (pinned) => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const updatedAt = '2026-11-18T09:07:02Z';
      const item = {
        id: 'conversation-1',
        agent_id: 'agent-1',
        title: 'Investigation',
        user: { id: 'user-1', username: 'test-user' },
        created_at: '2026-11-17T17:00:00Z',
        updated_at: updatedAt,
        pinned: !pinned,
        permissions: { rename: true, delete: true, update_access_control: true },
      } satisfies ListConversationsResponseItem;
      const detailKey = queryKeys.conversations.byId(item.id);
      const sourceKey = queryKeys.conversations.byAgent(item.agent_id, { pinned: !pinned });
      const targetKey = queryKeys.conversations.byAgent(item.agent_id, { pinned });
      queryClient.setQueryData<Conversation>(detailKey, { ...item, rounds: [] });
      queryClient.setQueryData<ConversationListCache>(sourceKey, createListCache([item]));
      queryClient.setQueryData<ConversationListCache>(targetKey, createListCache([]));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const { result, unmount } = renderHook(
        () =>
          useConversationListMutations({
            routeConversationId: item.id,
            agentId: item.agent_id,
          }),
        { wrapper }
      );

      act(() => {
        if (pinned) {
          result.current.markAsPinned(item.id);
        } else {
          result.current.markAsUnpinned(item.id);
        }
      });

      expect(queryClient.getQueryData<Conversation>(detailKey)).toMatchObject({
        pinned,
        updated_at: updatedAt,
      });
      expect(queryClient.getQueryData<ConversationListCache>(targetKey)?.pages[0].results).toEqual([
        { ...item, pinned },
      ]);
      expect(queryClient.getQueryData<ConversationListCache>(sourceKey)?.pages[0].results).toEqual(
        []
      );
      expect(mockUpdatePinnedStatus).toHaveBeenCalledWith({ conversationId: item.id, pinned });

      unmount();
      queryClient.clear();
    }
  );
});
