/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ConversationWithoutRounds } from '@kbn/onechat-common';
import { useConversationActions } from './use_conversation_actions';
import { appPaths } from '../utils/app_paths';

// Mock dependencies
jest.mock('./use_conversation_id', () => ({
  useConversationId: jest.fn(() => 'current-conversation-id'),
}));

jest.mock('./use_navigation', () => ({
  useNavigation: jest.fn(() => ({
    navigateToOnechatUrl: jest.fn(),
    createOnechatUrl: jest.fn(),
  })),
}));

jest.mock('./use_onechat_service', () => ({
  useOnechatServices: jest.fn(() => ({
    conversationsService: {
      delete: jest.fn(),
    },
  })),
}));

jest.mock('react-use/lib/useLocalStorage', () => jest.fn(() => [null, jest.fn()]));

jest.mock('./agents/use_agent_by_id', () => ({
  usePrefetchAgentById: jest.fn(() => jest.fn()),
}));

// Import mocked modules
import { useNavigation } from './use_navigation';
import { useOnechatServices } from './use_onechat_service';

const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockUseOnechatServices = useOnechatServices as jest.MockedFunction<typeof useOnechatServices>;

describe('useConversationActions', () => {
  let queryClient: QueryClient;
  let mockNavigateToOnechatUrl: jest.Mock;
  let mockDeleteConversation: jest.Mock;

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockNavigateToOnechatUrl = jest.fn();
    mockDeleteConversation = jest.fn().mockResolvedValue(undefined);

    mockUseNavigation.mockReturnValue({
      navigateToOnechatUrl: mockNavigateToOnechatUrl,
      createOnechatUrl: jest.fn(),
    });

    mockUseOnechatServices.mockReturnValue({
      conversationsService: {
        delete: mockDeleteConversation,
      },
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteConversation', () => {
    it('should navigate to new conversation when deleting the current conversation', async () => {
      const conversationList: ConversationWithoutRounds[] = [
        {
          id: 'current-conversation-id',
          title: 'Current',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          user: { id: 'user1', username: 'user1' },
          agent_id: 'agent1',
        },
        {
          id: 'conv-2',
          title: 'Second',
          created_at: '2023-01-02',
          updated_at: '2023-01-02',
          user: { id: 'user1', username: 'user1' },
          agent_id: 'agent1',
        },
      ];

      // Set up query cache with conversation list
      queryClient.setQueryData(['conversations', 'all'], conversationList);

      const { result } = renderHook(() => useConversationActions(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteConversation('current-conversation-id');
      });

      // Should call delete service
      expect(mockDeleteConversation).toHaveBeenCalledWith({
        conversationId: 'current-conversation-id',
      });

      // Should navigate to new conversation
      expect(mockNavigateToOnechatUrl).toHaveBeenCalledWith(appPaths.chat.new, undefined, {
        shouldStickToBottom: true,
      });

      // Should remove the deleted conversation from cache
      expect(
        queryClient.getQueryData(['conversations', 'byId', 'current-conversation-id'])
      ).toBeUndefined();

      // Should invalidate conversation list
      expect(queryClient.getQueryState(['conversations', 'all'])?.isInvalidated).toBe(true);
    });

    it('should not navigate when deleting other conversations (not current)', async () => {
      const conversationList: ConversationWithoutRounds[] = [
        {
          id: 'current-conversation-id',
          title: 'Current',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          user: { id: 'user1', username: 'user1' },
          agent_id: 'agent1',
        },
        {
          id: 'conv-2',
          title: 'Second',
          created_at: '2023-01-02',
          updated_at: '2023-01-02',
          user: { id: 'user1', username: 'user1' },
          agent_id: 'agent1',
        },
        {
          id: 'conv-3',
          title: 'Third',
          created_at: '2023-01-03',
          updated_at: '2023-01-03',
          user: { id: 'user1', username: 'user1' },
          agent_id: 'agent1',
        },
      ];

      // Set up query cache with conversation list
      queryClient.setQueryData(['conversations', 'all'], conversationList);

      const { result } = renderHook(() => useConversationActions(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteConversation('conv-2');
      });

      // Should call delete service
      expect(mockDeleteConversation).toHaveBeenCalledWith({ conversationId: 'conv-2' });

      // Should NOT navigate (stay at current conversation)
      expect(mockNavigateToOnechatUrl).not.toHaveBeenCalled();

      // Should remove the deleted conversation from cache
      expect(queryClient.getQueryData(['conversations', 'byId', 'conv-2'])).toBeUndefined();

      // Should invalidate conversation list
      expect(queryClient.getQueryState(['conversations', 'all'])?.isInvalidated).toBe(true);
    });

    it('should navigate to new conversation when deleting current conversation (only conversation)', async () => {
      const conversationList: ConversationWithoutRounds[] = [
        {
          id: 'current-conversation-id',
          title: 'Only',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          user: { id: 'user1', username: 'user1' },
          agent_id: 'agent1',
        },
      ];

      // Set up query cache with conversation list
      queryClient.setQueryData(['conversations', 'all'], conversationList);

      const { result } = renderHook(() => useConversationActions(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteConversation('current-conversation-id');
      });

      // Should call delete service
      expect(mockDeleteConversation).toHaveBeenCalledWith({
        conversationId: 'current-conversation-id',
      });

      // Should navigate to new conversation
      expect(mockNavigateToOnechatUrl).toHaveBeenCalledWith(appPaths.chat.new, undefined, {
        shouldStickToBottom: true,
      });

      // Should remove the deleted conversation from cache
      expect(
        queryClient.getQueryData(['conversations', 'byId', 'current-conversation-id'])
      ).toBeUndefined();

      // Should invalidate conversation list
      expect(queryClient.getQueryState(['conversations', 'all'])?.isInvalidated).toBe(true);
    });

    it('should not navigate when deleting non-current conversation with empty list', async () => {
      // Set up query cache with empty conversation list
      queryClient.setQueryData(['conversations', 'all'], []);

      const { result } = renderHook(() => useConversationActions(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteConversation('non-existent-conv');
      });

      // Should call delete service
      expect(mockDeleteConversation).toHaveBeenCalledWith({ conversationId: 'non-existent-conv' });

      // Should NOT navigate (not current conversation)
      expect(mockNavigateToOnechatUrl).not.toHaveBeenCalled();
    });

    it('should not navigate when deleting non-current conversation with missing cache', async () => {
      // Don't set any conversation list in cache
      const { result } = renderHook(() => useConversationActions(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteConversation('some-conv');
      });

      // Should call delete service
      expect(mockDeleteConversation).toHaveBeenCalledWith({ conversationId: 'some-conv' });

      // Should NOT navigate (not current conversation)
      expect(mockNavigateToOnechatUrl).not.toHaveBeenCalled();
    });
  });
});
