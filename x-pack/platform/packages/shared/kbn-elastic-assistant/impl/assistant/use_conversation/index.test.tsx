/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConversation } from '.';
import { act, waitFor, renderHook } from '@testing-library/react';
import { TestProviders } from '../../mock/test_providers/test_providers';
import React from 'react';
import { MessageRole } from '@kbn/elastic-assistant-common';
import { httpServiceMock } from '@kbn/core/public/mocks';
import {
  deleteConversation,
  getConversationById as _getConversationById,
  createConversation as _createConversationApi,
  updateConversation,
} from '../api/conversations';
import { emptyWelcomeConvo, welcomeConvo } from '../../mock/conversation';

jest.mock('../api/conversations');
const message = {
  content: 'You are a robot',
  role: 'user' as MessageRole,
  timestamp: '10/04/2023, 1:00:36 PM',
};
const anotherMessage = {
  content: 'I am a robot',
  role: 'assistant' as MessageRole,
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
    const { result } = renderHook(() => useConversation(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
      ),
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    createConversation.mockResolvedValue(mockConvo);

    let createResult;

    await act(async () => {
      createResult = await result.current.createConversation({
        ...mockConvo,
        replacements: {},
        title: mockConvo.title,
        category: 'assistant',
      });
    });

    expect(createResult).toEqual(mockConvo);
  });

  it('should delete an existing conversation when called with valid conversationId', async () => {
    const { result } = renderHook(() => useConversation(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
      ),
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    await act(async () => {
      await result.current.deleteConversation('new-convo');
    });

    expect(deleteConversation).toHaveBeenCalledWith({
      http: httpMock,
      id: 'new-convo',
    });
  });

  it('should update the apiConfig for an existing conversation when called with a valid conversationId and apiConfig', async () => {
    const { result } = renderHook(() => useConversation(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
      ),
    });
    await waitFor(() => new Promise((resolve) => resolve(null)));

    await act(async () => {
      await result.current.setApiConfig({
        conversation: welcomeConvo,
        apiConfig: mockConvo.apiConfig,
      });
    });

    expect(updateConversation).toHaveBeenCalledWith({
      http: httpMock,
      apiConfig: mockConvo.apiConfig,
      conversationId: welcomeConvo.id,
    });
  });

  it('should not update the apiConfig for conversation that does not yet exist', async () => {
    const { result } = renderHook(() => useConversation(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
      ),
    });
    await waitFor(() => new Promise((resolve) => resolve(null)));

    await act(async () => {
      const res = await result.current.setApiConfig({
        conversation: emptyWelcomeConvo,
        apiConfig: mockConvo.apiConfig,
      });
      expect(res).toEqual({
        ...emptyWelcomeConvo,
        apiConfig: mockConvo.apiConfig,
      });
    });

    expect(updateConversation).not.toHaveBeenCalled();
  });

  it('should remove the last message from a conversation when called with valid conversationId', async () => {
    const { result } = renderHook(() => useConversation(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
      ),
    });
    await waitFor(() => new Promise((resolve) => resolve(null)));

    getConversationById.mockResolvedValue(mockConvo);

    let removeResult;

    await act(async () => {
      removeResult = await result.current.removeLastMessage('new-convo');
    });

    expect(removeResult).toEqual([message]);
  });
});
