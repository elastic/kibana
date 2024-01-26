/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConversation } from '.';
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { alertConvo, welcomeConvo } from '../../mock/conversation';
import React from 'react';
import { ConversationRole } from '../../assistant_context/types';
const message = {
  content: 'You are a robot',
  role: 'user' as ConversationRole,
  timestamp: '10/04/2023, 1:00:36 PM',
};
const anotherMessage = {
  content: 'I am a robot',
  role: 'assistant' as ConversationRole,
  timestamp: '10/04/2023, 1:00:46 PM',
};

const mockConvo = {
  id: 'new-convo',
  messages: [message, anotherMessage],
  apiConfig: { defaultSystemPromptId: 'default-system-prompt' },
  theme: {
    title: 'Elastic AI Assistant',
    titleIcon: 'logoSecurity',
    assistant: { name: 'Assistant', icon: 'logoSecurity' },
    system: { icon: 'logoElastic' },
    user: {},
  },
};

describe('useConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should append a message to an existing conversation when called with valid conversationId and message', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
              }),
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      const appendResult = result.current.appendMessage({
        conversationId: welcomeConvo.id,
        message,
      });
      expect(appendResult).toHaveLength(3);
      expect(appendResult[2]).toEqual(message);
    });
  });

  it('should report telemetry when a message has been sent', async () => {
    await act(async () => {
      const reportAssistantMessageSent = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
              }),
              assistantTelemetry: {
                reportAssistantInvoked: () => {},
                reportAssistantQuickPrompt: () => {},
                reportAssistantSettingToggled: () => {},
                reportAssistantMessageSent,
              },
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();
      result.current.appendMessage({
        conversationId: welcomeConvo.id,
        message,
      });
      expect(reportAssistantMessageSent).toHaveBeenCalledWith({
        conversationId: 'Welcome',
        isEnabledKnowledgeBase: false,
        isEnabledRAGAlerts: false,
        role: 'user',
      });
    });
  });

  it('should create a new conversation when called with valid conversationId and message', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
              }),
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      const createResult = result.current.createConversation({
        conversationId: mockConvo.id,
        messages: mockConvo.messages,
      });

      expect(createResult).toEqual(mockConvo);
    });
  });

  it('should delete an existing conversation when called with valid conversationId', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
                [mockConvo.id]: mockConvo,
              }),
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      const deleteResult = result.current.deleteConversation('new-convo');

      expect(deleteResult).toEqual(mockConvo);
    });
  });

  it('should update the apiConfig for an existing conversation when called with a valid conversationId and apiConfig', async () => {
    await act(async () => {
      const setConversations = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [welcomeConvo.id]: welcomeConvo,
              }),
              setConversations,
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      result.current.setApiConfig({
        conversationId: welcomeConvo.id,
        apiConfig: mockConvo.apiConfig,
      });

      expect(setConversations).toHaveBeenCalledWith({
        [welcomeConvo.id]: { ...welcomeConvo, apiConfig: mockConvo.apiConfig },
      });
    });
  });

  it('overwrites a conversation', async () => {
    await act(async () => {
      const setConversations = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
              }),
              setConversations,
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      result.current.setConversation({
        conversation: {
          ...mockConvo,
          id: welcomeConvo.id,
        },
      });

      expect(setConversations).toHaveBeenCalledWith({
        [alertConvo.id]: alertConvo,
        [welcomeConvo.id]: { ...mockConvo, id: welcomeConvo.id },
      });
    });
  });

  it('clears a conversation', async () => {
    await act(async () => {
      const setConversations = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
              }),
              setConversations,
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      result.current.clearConversation(welcomeConvo.id);

      expect(setConversations).toHaveBeenCalledWith({
        [alertConvo.id]: alertConvo,
        [welcomeConvo.id]: {
          ...welcomeConvo,
          apiConfig: {
            ...welcomeConvo.apiConfig,
            defaultSystemPromptId: 'default-system-prompt',
          },
          messages: [],
          replacements: undefined,
        },
      });
    });
  });

  it('appends replacements', async () => {
    await act(async () => {
      const setConversations = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
              }),
              setConversations,
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      result.current.appendReplacements({
        conversationId: welcomeConvo.id,
        replacements: {
          '1.0.0.721': '127.0.0.1',
          '1.0.0.01': '10.0.0.1',
          'tsoh-tset': 'test-host',
        },
      });

      expect(setConversations).toHaveBeenCalledWith({
        [alertConvo.id]: alertConvo,
        [welcomeConvo.id]: {
          ...welcomeConvo,
          replacements: {
            '1.0.0.721': '127.0.0.1',
            '1.0.0.01': '10.0.0.1',
            'tsoh-tset': 'test-host',
          },
        },
      });
    });
  });

  it('should remove the last message from a conversation when called with valid conversationId', async () => {
    await act(async () => {
      const setConversations = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
                [mockConvo.id]: mockConvo,
              }),
              setConversations,
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      const removeResult = result.current.removeLastMessage('new-convo');

      expect(removeResult).toEqual([message]);
      expect(setConversations).toHaveBeenCalledWith({
        [alertConvo.id]: alertConvo,
        [welcomeConvo.id]: welcomeConvo,
        [mockConvo.id]: { ...mockConvo, messages: [message] },
      });
    });
  });

  it('amendMessage updates the last message of conversation[] for a given conversationId with provided content', async () => {
    await act(async () => {
      const setConversations = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders
            providerContext={{
              getInitialConversations: () => ({
                [alertConvo.id]: alertConvo,
                [welcomeConvo.id]: welcomeConvo,
                [mockConvo.id]: mockConvo,
              }),
              setConversations,
            }}
          >
            {children}
          </TestProviders>
        ),
      });
      await waitForNextUpdate();

      result.current.amendMessage({
        conversationId: 'new-convo',
        content: 'hello world',
      });

      expect(setConversations).toHaveBeenCalledWith({
        [alertConvo.id]: alertConvo,
        [welcomeConvo.id]: welcomeConvo,
        [mockConvo.id]: {
          ...mockConvo,
          messages: [
            message,
            {
              ...anotherMessage,
              content: 'hello world',
            },
          ],
        },
      });
    });
  });
});
