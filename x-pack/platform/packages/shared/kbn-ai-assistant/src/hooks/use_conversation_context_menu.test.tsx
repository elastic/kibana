/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { renderHook, act } from '@testing-library/react';
import type { Conversation } from '@kbn/observability-ai-assistant-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useConversationContextMenu } from './use_conversation_context_menu';

const setIsUpdatingConversationList = jest.fn();
const refreshConversations = jest.fn();

const mockService: { callApi: jest.Mock } = {
  callApi: jest.fn(),
};

const mockNotifications = {
  toasts: {
    addSuccess: jest.fn(),
    addError: jest.fn(),
  },
};

const mockHttp = {
  basePath: {
    prepend: jest.fn((path) => `/mock-base${path}`),
  },
};

const useKibanaMockServices = {
  uiSettings: { get: jest.fn() },
  notifications: mockNotifications,
  http: mockHttp,
  observabilityAIAssistant: { service: mockService },
};

describe('useConversationContextMenu', () => {
  const originalClipboard = global.window.navigator.clipboard;

  const wrapper = ({ children }: PropsWithChildren) => (
    <KibanaContextProvider services={useKibanaMockServices}>{children}</KibanaContextProvider>
  );

  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a conversation successfully', async () => {
    mockService.callApi.mockResolvedValueOnce({});
    const { result } = renderHook(
      () => useConversationContextMenu({ setIsUpdatingConversationList, refreshConversations }),
      { wrapper }
    );

    await act(async () => {
      await result.current.deleteConversation('1');
    });

    expect(setIsUpdatingConversationList).toHaveBeenCalledWith(true);
    expect(mockService.callApi).toHaveBeenCalledWith(
      'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
      {
        params: { path: { conversationId: '1' } },
        signal: null,
      }
    );
    expect(setIsUpdatingConversationList).toHaveBeenCalledWith(false);
    expect(refreshConversations).toHaveBeenCalled();
  });

  it('handles delete conversation errors', async () => {
    mockService.callApi.mockRejectedValueOnce(new Error('Delete failed'));
    const { result } = renderHook(
      () => useConversationContextMenu({ setIsUpdatingConversationList, refreshConversations }),
      { wrapper }
    );

    await act(async () => {
      await result.current.deleteConversation('1');
    });

    expect(mockNotifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Could not delete conversation',
      toastMessage: undefined,
    });
  });

  it('copies conversation content to clipboard', () => {
    const mockConversation: Conversation = {
      systemMessage: 'System message',
      conversation: {
        id: '1',
        title: 'Test Conversation',
        last_updated: new Date().toISOString(),
      },
      '@timestamp': new Date().toISOString(),
      labels: {},
      numeric_labels: {},
      messages: [],
      namespace: 'namespace-1',
      public: true,
    };

    const { result } = renderHook(
      () => useConversationContextMenu({ setIsUpdatingConversationList, refreshConversations }),
      { wrapper }
    );

    act(() => {
      result.current.copyConversationToClipboard(mockConversation);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify({
        title: mockConversation.conversation.title,
        systemMessage: mockConversation.systemMessage,
        messages: mockConversation.messages,
      })
    );

    expect(mockNotifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Conversation content copied to clipboard in JSON format',
    });
  });

  it('copies conversation URL to clipboard', () => {
    const { result } = renderHook(
      () => useConversationContextMenu({ setIsUpdatingConversationList, refreshConversations }),
      { wrapper }
    );

    act(() => {
      result.current.copyUrl('1');
    });

    expect(mockHttp.basePath.prepend).toHaveBeenCalledWith(
      '/app/observabilityAIAssistant/conversations/1'
    );
    expect(mockNotifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Conversation URL copied to clipboard',
    });
  });

  it('handles copy URL errors', () => {
    const { result } = renderHook(
      () => useConversationContextMenu({ setIsUpdatingConversationList, refreshConversations }),
      { wrapper }
    );

    jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => {
      throw new Error('Copy failed');
    });

    act(() => {
      result.current.copyUrl('1');
    });

    expect(mockNotifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Could not copy conversation URL',
    });
  });

  it('archives a conversation successfully', async () => {
    const archivedConversation = { conversation: { id: '1' }, archived: true };
    mockService.callApi.mockResolvedValueOnce(archivedConversation);

    const { result } = renderHook(
      () => useConversationContextMenu({ setIsUpdatingConversationList, refreshConversations }),
      { wrapper }
    );

    await act(async () => {
      const resultValue = await result.current.archiveConversation('1', true);
      expect(resultValue).toEqual(archivedConversation);
    });

    expect(setIsUpdatingConversationList).toHaveBeenCalledWith(true);
    expect(mockService.callApi).toHaveBeenCalledWith(
      'PATCH /internal/observability_ai_assistant/conversation/{conversationId}',
      {
        signal: null,
        params: {
          path: { conversationId: '1' },
          body: { archived: true },
        },
      }
    );
    expect(mockNotifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Conversation archived successfully',
    });
    expect(setIsUpdatingConversationList).toHaveBeenCalledWith(false);
  });

  it('handles errors when archiving a conversation', async () => {
    mockService.callApi.mockRejectedValueOnce(new Error('Archive failed'));

    const { result } = renderHook(
      () => useConversationContextMenu({ setIsUpdatingConversationList, refreshConversations }),
      { wrapper }
    );

    await act(async () => {
      await expect(result.current.archiveConversation('1', true)).rejects.toThrow('Archive failed');
    });

    expect(mockNotifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: 'Could not archive conversation',
    });
    expect(setIsUpdatingConversationList).toHaveBeenCalledWith(false);
  });

  it('unarchives a conversation successfully', async () => {
    const unarchivedConversation = { conversation: { id: '1' }, archived: false };
    mockService.callApi.mockResolvedValueOnce(unarchivedConversation);

    const { result } = renderHook(
      () => useConversationContextMenu({ setIsUpdatingConversationList, refreshConversations }),
      { wrapper }
    );

    await act(async () => {
      const resultValue = await result.current.archiveConversation('1', false);
      expect(resultValue).toEqual(unarchivedConversation);
    });

    expect(mockNotifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Conversation unarchived successfully',
    });
  });
});
