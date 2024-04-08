/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConversation } from '.';
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../mock/test_providers/test_providers';
import React from 'react';
import { ConversationRole } from '@kbn/elastic-assistant-common';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { WELCOME_CONVERSATION } from './sample_conversations';
import {
  deleteConversation,
  getConversationById as _getConversationById,
  createConversation as _createConversationApi,
} from '../api/conversations';

jest.mock('../api/conversations');
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
  title: 'new-convo',
  messages: [message, anotherMessage],
  apiConfig: {
    connectorId: '123',
    actionTypeId: '.gen-ai',
    defaultSystemPromptId: 'default-system-prompt',
  },
};

const getConversationById = _getConversationById as jest.Mock;
const createConversation = _createConversationApi as jest.Mock;

describe('useConversation', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();

    jest.clearAllMocks();
  });

  it('should create a new conversation when called with valid conversationId and message', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      await waitForNextUpdate();
      createConversation.mockResolvedValue(mockConvo);

      const createResult = await result.current.createConversation({
        ...mockConvo,
        replacements: {},
        title: mockConvo.title,
        category: 'assistant',
      });

      expect(createResult).toEqual(mockConvo);
    });
  });

  it('should delete an existing conversation when called with valid conversationId', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      await waitForNextUpdate();

      await result.current.deleteConversation('new-convo');

      expect(deleteConversation).toHaveBeenCalledWith({
        http: httpMock,
        id: 'new-convo',
      });
    });
  });

  it('should update the apiConfig for an existing conversation when called with a valid conversationId and apiConfig', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      await waitForNextUpdate();

      await result.current.setApiConfig({
        conversation: WELCOME_CONVERSATION,
        apiConfig: mockConvo.apiConfig,
      });

      expect(createConversation).toHaveBeenCalledWith({
        http: httpMock,
        conversation: { ...WELCOME_CONVERSATION, apiConfig: mockConvo.apiConfig, id: '' },
      });
    });
  });

  it('should remove the last message from a conversation when called with valid conversationId', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConversation(), {
        wrapper: ({ children }) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      await waitForNextUpdate();

      getConversationById.mockResolvedValue(mockConvo);

      const removeResult = await result.current.removeLastMessage('new-convo');

      expect(removeResult).toEqual([message]);
    });
  });
});
