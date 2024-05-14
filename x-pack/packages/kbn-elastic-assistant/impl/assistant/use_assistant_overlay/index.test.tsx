/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { DefinedUseQueryResult } from '@tanstack/react-query';

import { useAssistantOverlay } from '.';
import { waitFor } from '@testing-library/react';
import { useFetchCurrentUserConversations } from '../api';
import { Conversation } from '../../assistant_context/types';

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
jest.mock('../use_conversation', () => {
  return {
    useConversation: jest.fn(() => ({
      currentConversation: { id: 'conversation-id' },
    })),
  };
});
jest.mock('../helpers');
jest.mock('../../connectorland/helpers');
jest.mock('../../connectorland/use_load_connectors', () => {
  return {
    useLoadConnectors: jest.fn(() => ({
      data: [],
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
          ...mockData,
          welcome_id: {
            ...mockData.welcome_id,
            apiConfig: { newProp: true },
          },
        },
      }),
      isFetched: true,
    } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);
  });

  it('calls registerPromptContext with the expected context', async () => {
    const category = 'event';
    const description = 'test description';
    const getPromptContext = jest.fn(() => Promise.resolve('test data'));
    const id = 'test-id';
    const suggestedUserPrompt = 'test user prompt';
    const tooltip = 'test tooltip';

    renderHook(() =>
      useAssistantOverlay(
        category,
        null,
        description,
        getPromptContext,
        id,
        suggestedUserPrompt,
        tooltip
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
    const { unmount } = renderHook(() =>
      useAssistantOverlay(
        'event',
        null,
        'description',
        () => Promise.resolve('data'),
        'id',
        null,
        'tooltip'
      )
    );

    unmount();

    expect(mockUseAssistantContext.unRegisterPromptContext).toHaveBeenCalledWith('id');
  });

  it('calls `showAssistantOverlay` from the assistant context', () => {
    const { result } = renderHook(() =>
      useAssistantOverlay(
        'event',
        'conversation-id',
        'description',
        () => Promise.resolve('data'),
        'id',
        null,
        'tooltip'
      )
    );

    act(() => {
      result.current.showAssistantOverlay(true);
    });

    expect(mockUseAssistantContext.showAssistantOverlay).toHaveBeenCalledWith({
      showOverlay: true,
      promptContextId: 'id',
      conversationTitle: 'conversation-id',
    });
  });
});
