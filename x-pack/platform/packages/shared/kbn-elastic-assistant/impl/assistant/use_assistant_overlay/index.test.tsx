/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantOverlay } from '.';
import { waitFor, renderHook, act } from '@testing-library/react';
import { FetchCurrentUserConversations, useFetchCurrentUserConversations } from '../api';
import { mockConnectors } from '../../mock/connectors';

const mockUseAssistantContext = {
  registerPromptContext: jest.fn(),
  showAssistantOverlay: jest.fn(),
  unRegisterPromptContext: jest.fn(),
};
jest.mock('../../assistant_context', () => {
  const original = jest.requireActual('../../assistant_context');

  return {
    ...original,
    useAssistantContext: () => mockUseAssistantContext,
  };
});
jest.mock('../api/conversations/use_fetch_current_user_conversations');
const mockCreateConversation = jest.fn().mockResolvedValue({ id: 'conversation-id' });
jest.mock('../use_conversation', () => {
  return {
    useConversation: jest.fn(() => ({
      createConversation: mockCreateConversation,
      currentConversation: { id: 'conversation-id' },
    })),
  };
});

jest.mock('../../connectorland/helpers');
jest.mock('../../connectorland/use_load_connectors', () => {
  return {
    useLoadConnectors: jest.fn(() => ({
      data: mockConnectors,
      error: null,
      isSuccess: true,
    })),
  };
});

const mockData = {
  welcome_id: {
    id: 'welcome_id',
    title: 'Welcome',
    category: 'assistant',
    messages: [],
    apiConfig: { connectorId: '123' },
    replacements: {},
  },
  electric_sheep_id: {
    id: 'electric_sheep_id',
    category: 'assistant',
    title: 'electric sheep',
    messages: [],
    apiConfig: { connectorId: '123' },
    replacements: {},
  },
};

describe('useAssistantOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({
        isLoading: false,
        data: {
          pages: [
            {
              page: 1,
              perPage: 28,
              total: 150,
              data: Object.values(mockData),
            },
          ],
        },
      }),
      isFetched: true,
      isFetching: false,
      setPaginationObserver: jest.fn(),
    } as unknown as FetchCurrentUserConversations);
  });

  it('calls registerPromptContext with the expected context', async () => {
    const category = 'event';
    const description = 'test description';
    const getPromptContext = jest.fn(() => Promise.resolve('test data'));
    const id = 'test-id';
    const suggestedUserPrompt = 'test user prompt';
    const tooltip = 'test tooltip';
    const isAssistantAvailable = true;

    renderHook(() =>
      useAssistantOverlay(
        category,
        null,
        description,
        getPromptContext,
        id,
        suggestedUserPrompt,
        tooltip,
        isAssistantAvailable
      )
    );

    await waitFor(() => {
      expect(mockUseAssistantContext.registerPromptContext).toHaveBeenCalledWith({
        category,
        description,
        getPromptContext,
        id,
        suggestedUserPrompt,
        tooltip,
      });
    });
  });

  it('calls unRegisterPromptContext on unmount', () => {
    const isAssistantAvailable = true;
    const { unmount } = renderHook(() =>
      useAssistantOverlay(
        'event',
        null,
        'description',
        () => Promise.resolve('data'),
        'id',
        null,
        'tooltip',
        isAssistantAvailable
      )
    );

    unmount();

    expect(mockUseAssistantContext.unRegisterPromptContext).toHaveBeenCalledWith('id');
  });

  it('calls `showAssistantOverlay` when the conversation does not exist', async () => {
    const isAssistantAvailable = true;
    const { result } = renderHook(() =>
      useAssistantOverlay(
        'event',
        'conversation-id',
        'description',
        () => Promise.resolve('data'),
        'id',
        null,
        'tooltip',
        isAssistantAvailable
      )
    );

    act(() => {
      result.current.showAssistantOverlay(true);
    });

    await waitFor(() => {
      expect(mockUseAssistantContext.showAssistantOverlay).toHaveBeenCalledWith({
        showOverlay: true,
        promptContextId: 'id',
        selectedConversation: {
          title: 'conversation-id',
        },
      });
    });
  });

  it('calls `showAssistantOverlay` and does not create a new conversation when shouldCreateConversation: true and the conversation exists', async () => {
    const isAssistantAvailable = true;
    const { result } = renderHook(() =>
      useAssistantOverlay(
        'event',
        'electric sheep',
        'description',
        () => Promise.resolve('data'),
        'id',
        null,
        'tooltip',
        isAssistantAvailable
      )
    );

    act(() => {
      result.current.showAssistantOverlay(true);
    });

    await waitFor(() => {
      expect(mockUseAssistantContext.showAssistantOverlay).toHaveBeenCalledWith({
        showOverlay: true,
        promptContextId: 'id',
        selectedConversation: {
          id: 'electric_sheep_id',
        },
      });
    });
  });
});
