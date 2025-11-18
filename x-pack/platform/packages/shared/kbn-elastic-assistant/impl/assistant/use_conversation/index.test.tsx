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
import type { MessageRole } from '@kbn/elastic-assistant-common';
import { httpServiceMock } from '@kbn/core/public/mocks';
import {
  deleteConversation,
  getConversationById as _getConversationById,
  createConversation as _createConversationApi,
  updateConversation as _updateConversation,
} from '../api/conversations';
import { emptyWelcomeConvo, welcomeConvo } from '../../mock/conversation';
import type { IToasts } from '@kbn/core-notifications-browser';

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
  ...welcomeConvo,
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
const updateConversation = _updateConversation as jest.Mock;
describe('useConversation', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;
  const toastsMock = { addSuccess: jest.fn(), addError: jest.fn() } as unknown as IToasts;
  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();
    jest.clearAllMocks();
  });

  describe('conversation create', () => {
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
  });

  describe('conversation delete', () => {
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
  });

  describe('conversation update', () => {
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
    it('should update conversation title', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      updateConversation.mockResolvedValue({ ...mockConvo, title: 'updated-title' });
      await act(async () => {
        const res = await result.current.updateConversationTitle({
          conversationId: mockConvo.id,
          updatedTitle: 'updated-title',
        });
        expect(updateConversation).toHaveBeenCalledWith({
          http: httpMock,
          conversationId: mockConvo.id,
          title: 'updated-title',
        });
        expect(res).toEqual({ ...mockConvo, title: 'updated-title' });
      });
    });
    it('should update conversation users', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      updateConversation.mockResolvedValue({ ...mockConvo, users: [{ name: 'user1' }] });
      await act(async () => {
        const res = await result.current.updateConversationUsers({
          conversationId: mockConvo.id,
          updatedUsers: [{ name: 'user1' }],
        });
        expect(updateConversation).toHaveBeenCalledWith({
          http: httpMock,
          conversationId: mockConvo.id,
          users: [{ name: 'user1' }],
        });
        expect(res).toEqual({ ...mockConvo, users: [{ name: 'user1' }] });
      });
    });
  });

  describe('conversation message actions', () => {
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
    it('should return undefined when removing last message from non-existent conversation', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      getConversationById.mockResolvedValue(undefined);
      await act(async () => {
        const res = await result.current.removeLastMessage('bad-id');
        expect(res).toEqual([]);
        expect(updateConversation).not.toHaveBeenCalled();
      });
    });
    it('should get a conversation with toasts when silent is false', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock, toasts: toastsMock }}>
            {children}
          </TestProviders>
        ),
      });
      getConversationById.mockResolvedValue(mockConvo);
      await act(async () => {
        const convo = await result.current.getConversation('new-convo', false);
        expect(getConversationById).toHaveBeenCalledWith({
          http: httpMock,
          id: 'new-convo',
          toasts: expect.anything(),
        });
        expect(convo).toEqual(mockConvo);
      });
    });
    it('should get a conversation without toasts when silent is true', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      getConversationById.mockResolvedValue(mockConvo);
      await act(async () => {
        const convo = await result.current.getConversation('new-convo', true);
        expect(getConversationById).toHaveBeenCalledWith({
          http: httpMock,
          id: 'new-convo',
          toasts: undefined,
        });
        expect(convo).toEqual(mockConvo);
      });
    });
  });

  describe('conversation clearing', () => {
    it('should clear a conversation with apiConfig', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      updateConversation.mockResolvedValue({ ...mockConvo, messages: [] });
      await act(async () => {
        const res = await result.current.clearConversation(mockConvo);
        expect(updateConversation).toHaveBeenCalledWith({
          http: httpMock,
          conversationId: mockConvo.id,
          apiConfig: expect.objectContaining({ actionTypeId: '.gen-ai', connectorId: '123' }),
          messages: [],
          replacements: {},
        });
        expect(res).toEqual({ ...mockConvo, messages: [] });
      });
    });
    it('should not clear a conversation without apiConfig', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock }}>{children}</TestProviders>
        ),
      });
      await act(async () => {
        const res = await result.current.clearConversation({ ...mockConvo, apiConfig: undefined });
        expect(res).toBeUndefined();
        expect(updateConversation).not.toHaveBeenCalled();
      });
    });
  });

  describe('conversation duplicate', () => {
    it('should handle duplicateConversation with no selectedConversation', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock, toasts: toastsMock }}>
            {children}
          </TestProviders>
        ),
      });
      await act(async () => {
        await result.current.duplicateConversation({
          refetchCurrentUserConversations: jest.fn(),
          selectedConversation: undefined,
          setCurrentConversation: jest.fn(),
        });
      });
      expect(toastsMock?.addError).toHaveBeenCalled();
    });
    it('should handle duplicateConversation with empty id', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock, toasts: toastsMock }}>
            {children}
          </TestProviders>
        ),
      });
      await act(async () => {
        await result.current.duplicateConversation({
          refetchCurrentUserConversations: jest.fn(),
          selectedConversation: { ...mockConvo, id: '' },
          setCurrentConversation: jest.fn(),
        });
      });
      expect(toastsMock?.addError).toHaveBeenCalled();
    });
    it('should fetch conversation details if messages are empty during duplicateConversation', async () => {
      const refetchMock = jest.fn();
      const setCurrentMock = jest.fn();

      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock, toasts: toastsMock }}>
            {children}
          </TestProviders>
        ),
      });
      getConversationById.mockResolvedValue({ ...mockConvo, messages: [message, anotherMessage] });
      createConversation.mockResolvedValue({
        ...mockConvo,
        id: 'duplicated',
        title: '[Duplicate] new-convo',
      });
      await act(async () => {
        await result.current.duplicateConversation({
          refetchCurrentUserConversations: refetchMock,
          selectedConversation: { ...mockConvo, messages: [] },
          setCurrentConversation: setCurrentMock,
        });
      });
      expect(getConversationById).toHaveBeenCalled();
      expect(createConversation).toHaveBeenCalled();
      expect(refetchMock).toHaveBeenCalled();
      expect(setCurrentMock).toHaveBeenCalledWith({
        ...mockConvo,
        id: 'duplicated',
        title: '[Duplicate] new-convo',
      });
      expect(toastsMock.addSuccess).toHaveBeenCalled();
    });
    it('should handle failed duplicateConversation', async () => {
      const refetchMock = jest.fn();
      const setCurrentMock = jest.fn();

      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock, toasts: toastsMock }}>
            {children}
          </TestProviders>
        ),
      });
      createConversation.mockResolvedValue(undefined);
      await act(async () => {
        await result.current.duplicateConversation({
          refetchCurrentUserConversations: refetchMock,
          selectedConversation: mockConvo,
          setCurrentConversation: setCurrentMock,
        });
      });
      expect(toastsMock.addError).toHaveBeenCalled();
    });
  });

  describe('conversation URL actions', () => {
    it('should copy conversation url successfully', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock, toasts: toastsMock }}>
            {children}
          </TestProviders>
        ),
      });
      Object.assign(window.navigator, { clipboard: { writeText: jest.fn() } });
      httpMock.basePath.prepend = jest
        .fn()
        .mockReturnValue('/app/security/get_started?assistant=new-convo');
      await act(async () => {
        await result.current.copyConversationUrl(mockConvo);
      });
      expect(window.navigator.clipboard.writeText).toHaveBeenCalled();
      expect(toastsMock.addSuccess).toHaveBeenCalled();
    });
    it('should handle copyConversationUrl with no conversation', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock, toasts: toastsMock }}>
            {children}
          </TestProviders>
        ),
      });
      await act(async () => {
        await result.current.copyConversationUrl(undefined);
      });
      expect(toastsMock.addError).toHaveBeenCalled();
    });
    it('should handle copyConversationUrl with invalid url', async () => {
      const { result } = renderHook(() => useConversation(), {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders providerContext={{ http: httpMock, toasts: toastsMock }}>
            {children}
          </TestProviders>
        ),
      });
      httpMock.basePath.prepend = jest.fn().mockReturnValue(undefined);
      await act(async () => {
        await result.current.copyConversationUrl(mockConvo);
      });
      expect(toastsMock.addError).toHaveBeenCalled();
    });
  });
});
