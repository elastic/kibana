/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Assistant } from '.';
import type { IHttpFetchError } from '@kbn/core/public';

import { useLoadConnectors } from '../connectorland/use_load_connectors';
import { useConnectorSetup } from '../connectorland/connector_setup';

import { DefinedUseQueryResult, UseQueryResult } from '@tanstack/react-query';

import { useLocalStorage, useSessionStorage } from 'react-use';
import { PromptEditor } from './prompt_editor';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { mockAssistantAvailability, TestProviders } from '../mock/test_providers/test_providers';
import { useFetchCurrentUserConversations } from './api';
import { Conversation } from '../assistant_context/types';
import * as all from './chat_send/use_chat_send';
import { useConversation } from './use_conversation';
import { AIConnector } from '../connectorland/connector_selector';
import { omit } from 'lodash';

jest.mock('../connectorland/use_load_connectors');
jest.mock('../connectorland/connector_setup');
jest.mock('react-use');

jest.mock('./prompt_editor', () => ({ PromptEditor: jest.fn() }));
jest.mock('./quick_prompts/quick_prompts', () => ({ QuickPrompts: jest.fn() }));
jest.mock('./api/conversations/use_fetch_current_user_conversations');

jest.mock('./use_conversation');

const renderAssistant = (extraProps = {}, providerProps = {}) =>
  render(
    <TestProviders>
      <Assistant chatHistoryVisible={false} setChatHistoryVisible={jest.fn()} {...extraProps} />
    </TestProviders>
  );

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
const mockDeleteConvo = jest.fn();
const mockUseConversation = {
  getConversation: jest.fn(),
  getDefaultConversation: jest.fn().mockReturnValue(mockData.welcome_id),
  deleteConversation: mockDeleteConvo,
  setApiConfig: jest.fn().mockResolvedValue({}),
};

describe('Assistant', () => {
  beforeAll(() => {
    (useConversation as jest.Mock).mockReturnValue(mockUseConversation);
    jest.mocked(useConnectorSetup).mockReturnValue({
      comments: [],
      prompt: <></>,
    });

    jest.mocked(PromptEditor).mockReturnValue(null);
    jest.mocked(QuickPrompts).mockReturnValue(null);
    const connectors: unknown[] = [
      {
        id: 'hi',
        name: 'OpenAI connector',
        actionTypeId: '.gen-ai',
      },
    ];
    jest.mocked(useLoadConnectors).mockReturnValue({
      isSuccess: true,
      data: connectors,
    } as unknown as UseQueryResult<AIConnector[], IHttpFetchError>);

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
      isSuccess: true,
    } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);
  });

  let persistToLocalStorage: jest.Mock;
  let persistToSessionStorage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    persistToLocalStorage = jest.fn();
    persistToSessionStorage = jest.fn();

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
    it('should refetchConversationsState after settings save button click', async () => {
      const chatSendSpy = jest.spyOn(all, 'useChatSend');
      const setConversationTitle = jest.fn();

      renderAssistant({ setConversationTitle });

      expect(chatSendSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          currentConversation: mockData.welcome_id,
        })
      );

      fireEvent.click(screen.getByTestId('settings'));

      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          ...mockData,
          welcome_id: {
            ...mockData.welcome_id,
            apiConfig: { newProp: true },
          },
        },
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
        isSuccess: true,
      } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'));
      });

      expect(chatSendSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          currentConversation: {
            apiConfig: { newProp: true },
            category: 'assistant',
            id: mockData.welcome_id.id,
            messages: [],
            title: 'Welcome',
            replacements: {},
          },
        })
      );
    });

    it('should refetchConversationsState after settings save button click, but do not update convos when refetch returns bad results', async () => {
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: jest.fn().mockResolvedValue({
          isLoading: false,
          data: omit(mockData, 'welcome_id'),
        }),
        isSuccess: true,
      } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);
      const chatSendSpy = jest.spyOn(all, 'useChatSend');
      const setConversationTitle = jest.fn();

      renderAssistant({ setConversationTitle });

      fireEvent.click(screen.getByTestId('settings'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('save-button'));
      });

      expect(chatSendSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          currentConversation: {
            apiConfig: { connectorId: '123' },
            replacements: {},
            category: 'assistant',
            id: mockData.welcome_id.id,
            messages: [],
            title: 'Welcome',
          },
        })
      );
    });

    it('should delete conversation when delete button is clicked', async () => {
      renderAssistant();
      await act(async () => {
        fireEvent.click(
          within(screen.getByTestId('conversation-selector')).getByTestId(
            'comboBoxToggleListButton'
          )
        );
      });

      const deleteButton = screen.getAllByTestId('delete-option')[0];
      await act(async () => {
        fireEvent.click(deleteButton);
      });
      expect(mockDeleteConvo).toHaveBeenCalledWith(mockData.welcome_id.id);
    });
  });
  describe('when selected conversation changes and some connectors are loaded', () => {
    it('should persist the conversation id to local storage', async () => {
      const getConversation = jest.fn().mockResolvedValue(mockData.electric_sheep_id);
      (useConversation as jest.Mock).mockReturnValue({
        ...mockUseConversation,
        getConversation,
      });
      renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith(mockData.welcome_id.id);

      const previousConversationButton = screen.getByLabelText('Previous conversation');

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
        isSuccess: true,
      } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);

      const { getByLabelText } = renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith(mockData.welcome_id.id);

      const previousConversationButton = getByLabelText('Previous conversation');

      expect(previousConversationButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(previousConversationButton);
      });
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(mockData.welcome_id.id);
    });
    it('should call the setConversationTitle callback if it is defined and the conversation id changes', async () => {
      const getConversation = jest.fn().mockResolvedValue(mockData.electric_sheep_id);
      (useConversation as jest.Mock).mockReturnValue({
        ...mockUseConversation,
        getConversation,
      });
      const setConversationTitle = jest.fn();

      renderAssistant({ setConversationTitle });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Previous conversation'));
      });

      expect(setConversationTitle).toHaveBeenLastCalledWith('electric sheep');
    });
    it('should fetch current conversation when id has value', async () => {
      const getConversation = jest
        .fn()
        .mockResolvedValue({ ...mockData.electric_sheep_id, title: 'updated title' });
      (useConversation as jest.Mock).mockReturnValue({
        ...mockUseConversation,
        getConversation,
      });
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          ...mockData,
          electric_sheep_id: { ...mockData.electric_sheep_id, title: 'updated title' },
        },
        isLoading: false,
        refetch: jest.fn().mockResolvedValue({
          isLoading: false,
          data: {
            ...mockData,
            electric_sheep_id: { ...mockData.electric_sheep_id, title: 'updated title' },
          },
        }),
        isSuccess: true,
      } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);
      renderAssistant();

      const previousConversationButton = screen.getByLabelText('Previous conversation');
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });

      expect(getConversation).toHaveBeenCalledWith('electric_sheep_id');

      expect(persistToLocalStorage).toHaveBeenLastCalledWith('electric_sheep_id');
    });
    it('should refetch all conversations when id is empty', async () => {
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
        isSuccess: true,
      } as unknown as DefinedUseQueryResult<Record<string, Conversation>, unknown>);
      renderAssistant();

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
      renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(mockData.welcome_id.id);
    });
  });

  describe('when not authorized', () => {
    it('should be disabled', async () => {
      const { queryByTestId } = renderAssistant(
        {},
        {
          assistantAvailability: { ...mockAssistantAvailability, isAssistantEnabled: false },
        }
      );
      expect(queryByTestId('prompt-textarea')).toHaveProperty('disabled');
    });
  });
});
