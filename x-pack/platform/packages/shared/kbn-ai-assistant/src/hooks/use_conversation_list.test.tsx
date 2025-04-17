/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useConversationList } from './use_conversation_list';

const mockService: { callApi: jest.Mock } = {
  callApi: jest.fn(),
};

const useKibanaMockServices = {
  uiSettings: {
    get: jest.fn(),
  },
  observabilityAIAssistant: {
    service: mockService,
  },
};

describe('useConversationList', () => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <KibanaContextProvider services={useKibanaMockServices}>{children}</KibanaContextProvider>
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches conversations on mount', async () => {
    const mockResponse = { conversations: [{ id: '1', title: 'Test Conversation' }] };
    mockService.callApi.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(useConversationList, { wrapper });

    expect(result.current.isLoadingConversationList).toBe(true);
    await act(async () => {});
    expect(result.current.conversations.value).toEqual(mockResponse);
  });

  it('refreshes conversations when refreshConversations is called', async () => {
    const mockResponse = { conversations: [{ id: '1', title: 'Test Conversation' }] };
    mockService.callApi.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(useConversationList, { wrapper });
    await act(async () => {});
    expect(result.current.conversations.value).toEqual(mockResponse);

    const newMockResponse = { conversations: [{ id: '2', title: 'New Conversation' }] };
    mockService.callApi.mockResolvedValueOnce(newMockResponse);

    await act(async () => {
      result.current.refreshConversations();
    });

    expect(result.current.conversations.value).toEqual(newMockResponse);
  });

  it('sets loading state correctly during API calls', async () => {
    const mockResponse = { conversations: [] };
    mockService.callApi.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(useConversationList, { wrapper });
    expect(result.current.isLoadingConversationList).toBe(true);

    await act(async () => {});
    expect(result.current.isLoadingConversationList).toBe(false);
  });

  it('allows manual update of loading state', async () => {
    const { result } = renderHook(useConversationList, { wrapper });

    act(() => {
      result.current.setIsUpdatingConversationList(true);
    });
    expect(result.current.isLoadingConversationList).toBe(true);

    act(() => {
      result.current.setIsUpdatingConversationList(false);
    });
    expect(result.current.isLoadingConversationList).toBe(false);
  });
});
