/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Assistant } from '.';
import type { IHttpFetchError } from '@kbn/core/public';

import { useLoadConnectors } from '../connectorland/use_load_connectors';

import { DefinedUseQueryResult, UseQueryResult } from '@tanstack/react-query';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { TestProviders } from '../mock/test_providers/test_providers';
import { useFetchCurrentUserConversations } from './api';
import { Conversation } from '../assistant_context/types';
import * as all from './chat_send/use_chat_send';
import { useConversation } from './use_conversation';
import { AIConnector } from '../connectorland/connector_selector';

jest.mock('../connectorland/use_load_connectors');
jest.mock('../connectorland/connector_setup');
jest.mock('react-use/lib/useLocalStorage');
jest.mock('react-use/lib/useSessionStorage');

jest.mock('./quick_prompts/quick_prompts', () => ({ QuickPrompts: jest.fn() }));
jest.mock('./api/conversations/use_fetch_current_user_conversations');

jest.mock('./use_conversation');

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

const renderAssistant = async (extraProps = {}) => {
  const chatSendSpy = jest.spyOn(all, 'useChatSend');
  const assistant = render(
    <TestProviders>
      <Assistant
        conversationTitle={'Welcome'}
        chatHistoryVisible={true}
        setChatHistoryVisible={jest.fn()}
        {...extraProps}
      />
    </TestProviders>
  );
  await waitFor(() => {
    // wait for conversation to mount before performing any tests
    expect(chatSendSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentConversation: mockData.welcome_id,
      })
    );
  });
  return assistant;
};
const mockDeleteConvo = jest.fn();
const mockGetDefaultConversation = jest.fn().mockReturnValue(mockData.welcome_id);
const clearConversation = jest.fn();
const mockUseConversation = {
  clearConversation: clearConversation.mockResolvedValue(mockData.welcome_id),
  getConversation: jest.fn(),
  getDefaultConversation: mockGetDefaultConversation,
  deleteConversation: mockDeleteConvo,
  setApiConfig: jest.fn().mockResolvedValue({}),
};

const refetchResults = jest.fn();

describe('Assistant', () => {
  let persistToLocalStorage: jest.Mock;
  let persistToSessionStorage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    persistToLocalStorage = jest.fn();
    persistToSessionStorage = jest.fn();
    (useConversation as jest.Mock).mockReturnValue(mockUseConversation);

    jest.mocked(QuickPrompts).mockReturnValue(null);
    const connectors: unknown[] = [
      {
        id: 'hi',
        name: 'OpenAI connector',
        actionTypeId: '.gen-ai',
      },
    ];
    jest.mocked(useLoadConnectors).mockReturnValue({
      isFetched: true,
      isFetchedAfterMount: true,
      data: connectors,
    } as unknown as UseQueryResult<AIConnector[], IHttpFetchError>);

    jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: refetchResults.mockResolvedValue({
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
    jest
      .mocked(useLocalStorage)
      .mockReturnValue([undefined, persistToLocalStorage] as unknown as ReturnType<
        typeof useLocalStorage
      >);
    jest
      .mocked(useSessionStorage)
      .mockReturnValue([undefined, persistToSessionStorage] as unknown as ReturnType<
        typeof useSessionStorage
      >);
  });

  describe('persistent storage', () => {
    it('should delete conversation when delete button is clicked', async () => {
      await renderAssistant();
      const deleteButton = screen.getAllByTestId('delete-option')[0];
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      });

      await waitFor(() => {
        expect(mockDeleteConvo).toHaveBeenCalledWith(mockData.electric_sheep_id.id);
      });
    });
    it('should refetchCurrentUserConversations after clear chat history button click', async () => {
      await renderAssistant();
      fireEvent.click(screen.getByTestId('chat-context-menu'));
      fireEvent.click(screen.getByTestId('clear-chat'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      await waitFor(() => {
        expect(clearConversation).toHaveBeenCalled();
        expect(refetchResults).toHaveBeenCalled();
      });
    });
  });

  describe('when selected conversation changes and some connectors are loaded', () => {
    it('should persist the conversation id to local storage', async () => {
      const getConversation = jest.fn().mockResolvedValue(mockData.electric_sheep_id);
      (useConversation as jest.Mock).mockReturnValue({
        ...mockUseConversation,
        getConversation,
      });
      await renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith(mockData.welcome_id.id);

      const previousConversationButton = await screen.findByText(mockData.electric_sheep_id.title);
      expect(previousConversationButton).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });

      expect(persistToLocalStorage).toHaveBeenLastCalledWith('electric_sheep_id');
    });

    it('should not persist the conversation id to local storage when excludeFromLastConversationStorage flag is indicated', async () => {
      const conversation = {
        ...mockData.electric_sheep_id,
        excludeFromLastConversationStorage: true,
      };
      const getConversation = jest.fn().mockResolvedValue(conversation);
      (useConversation as jest.Mock).mockReturnValue({
        ...mockUseConversation,
        getConversation,
      });
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          ...mockData,
          electric_sheep_id: conversation,
        },
        isLoading: false,
        refetch: jest.fn().mockResolvedValue({
          isLoading: false,
          data: {
            ...mockData,
            electric_sheep_id: conversation,
          },
        }),
        isFetched: true,
      } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);

      const { findByText } = await renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith(mockData.welcome_id.id);

      const previousConversationButton = await findByText(mockData.electric_sheep_id.title);

      expect(previousConversationButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(previousConversationButton);
      });
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(mockData.welcome_id.id);
    });

    it('should fetch current conversation when id has value', async () => {
      const refetch = jest.fn();
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          ...mockData,
          electric_sheep_id: { ...mockData.electric_sheep_id, title: 'updated title' },
        },
        isLoading: false,
        refetch: refetch.mockResolvedValue({
          isLoading: false,
          data: {
            ...mockData,
            electric_sheep_id: { ...mockData.electric_sheep_id, title: 'updated title' },
          },
        }),
        isFetched: true,
      } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);
      await renderAssistant();

      const previousConversationButton = await screen.findByText('updated title');
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });

      expect(refetch).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith('electric_sheep_id');
    });
    it.skip('should refetch all conversations when id is empty', async () => {
      const chatSendSpy = jest.spyOn(all, 'useChatSend');
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          ...mockData,
          'electric sheep': { ...mockData.electric_sheep_id, id: '', apiConfig: { newProp: true } },
        },
        isLoading: false,
        refetch: jest.fn().mockResolvedValue({
          isLoading: false,
          data: {
            ...mockData,
            'electric sheep': {
              ...mockData.electric_sheep_id,
              id: '',
              apiConfig: { newProp: true },
            },
          },
        }),
        isFetched: true,
      } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);
      await renderAssistant();

      const previousConversationButton = screen.getByLabelText('Previous conversation');
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });
      expect(chatSendSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          currentConversation: {
            ...mockData.electric_sheep_id,
            id: '',
            apiConfig: { newProp: true },
          },
        })
      );
    });
  });

  describe('when no connectors are loaded', () => {
    it('should set welcome conversation id in local storage', async () => {
      await renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(mockData.welcome_id.id);
    });
  });

  describe('when not authorized', () => {
    it('should be disabled', async () => {
      const { queryByTestId } = await renderAssistant({});
      expect(queryByTestId('prompt-textarea')).toHaveProperty('disabled');
    });
  });
});
