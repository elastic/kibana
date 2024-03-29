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

import { UseQueryResult } from '@tanstack/react-query';
import { WELCOME_CONVERSATION_TITLE } from './use_conversation/translations';

import { useLocalStorage } from 'react-use';
import { PromptEditor } from './prompt_editor';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { mockAssistantAvailability, TestProviders } from '../mock/test_providers/test_providers';
import { useFetchCurrentUserConversations } from './api';
import { Conversation } from '../assistant_context/types';
import * as all from './chat_send/use_chat_send';
import { useConversation } from './use_conversation';
import { AIConnector } from '../connectorland/connector_selector';

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
      <Assistant {...extraProps} />
    </TestProviders>
  );

const mockData = {
  Welcome: {
    id: 'Welcome Id',
    title: 'Welcome',
    category: 'assistant',
    messages: [],
    apiConfig: { connectorId: '123' },
    replacements: [],
  },
  'electric sheep': {
    id: 'electric sheep id',
    category: 'assistant',
    title: 'electric sheep',
    messages: [],
    apiConfig: { connectorId: '123' },
    replacements: [],
  },
};
const mockDeleteConvo = jest.fn();
const mockUseConversation = {
  getConversation: jest.fn(),
  getDefaultConversation: jest.fn().mockReturnValue(mockData.Welcome),
  deleteConversation: mockDeleteConvo,
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
          Welcome: {
            ...mockData.Welcome,
            apiConfig: { newProp: true },
          },
        },
      }),
    } as unknown as UseQueryResult<Record<string, Conversation>, unknown>);
  });

  let persistToLocalStorage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    persistToLocalStorage = jest.fn();

    jest
      .mocked(useLocalStorage)
      .mockReturnValue([undefined, persistToLocalStorage] as unknown as ReturnType<
        typeof useLocalStorage
      >);
  });

  describe('persistent storage', () => {
    it('should refetchConversationsState after settings save button click', async () => {
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
            apiConfig: { newProp: true },
            category: 'assistant',
            id: 'Welcome Id',
            messages: [],
            title: 'Welcome',
            replacements: [],
          },
        })
      );
    });

    it('should refetchConversationsState after settings save button click, but do not update convos when refetch returns bad results', async () => {
      const { Welcome, ...rest } = mockData;
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: jest.fn().mockResolvedValue({
          isLoading: false,
          data: rest,
        }),
      } as unknown as UseQueryResult<Record<string, Conversation>, unknown>);
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
            replacements: [],
            category: 'assistant',
            id: 'Welcome Id',
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
      expect(mockDeleteConvo).toHaveBeenCalledWith('Welcome Id');
    });
  });
  describe('when selected conversation changes and some connectors are loaded', () => {
    it('should persist the conversation title to local storage', async () => {
      renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith(WELCOME_CONVERSATION_TITLE);

      const previousConversationButton = screen.getByLabelText('Previous conversation');

      expect(previousConversationButton).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });

      expect(persistToLocalStorage).toHaveBeenLastCalledWith('electric sheep');
    });

    it('should not persist the conversation id to local storage when excludeFromLastConversationStorage flag is indicated', async () => {
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          ...mockData,
          'electric sheep': {
            ...mockData['electric sheep'],
            excludeFromLastConversationStorage: true,
          },
        },
        isLoading: false,
        refetch: jest.fn(),
      } as unknown as UseQueryResult<Record<string, Conversation>, unknown>);

      const { getByLabelText } = renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith(WELCOME_CONVERSATION_TITLE);

      const previousConversationButton = getByLabelText('Previous conversation');

      expect(previousConversationButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(previousConversationButton);
      });
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(WELCOME_CONVERSATION_TITLE);
    });
    it('should call the setConversationTitle callback if it is defined and the conversation id changes', async () => {
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
        .mockResolvedValue({ ...mockData['electric sheep'], title: 'updated title' });
      (useConversation as jest.Mock).mockReturnValue({
        ...mockUseConversation,
        getConversation,
      });
      renderAssistant();

      const previousConversationButton = screen.getByLabelText('Previous conversation');
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });

      expect(getConversation).toHaveBeenCalledWith('electric sheep id');

      expect(persistToLocalStorage).toHaveBeenLastCalledWith('updated title');
    });
    it('should refetch all conversations when id is empty', async () => {
      const chatSendSpy = jest.spyOn(all, 'useChatSend');
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          ...mockData,
          'electric sheep': { ...mockData['electric sheep'], id: '' },
        },
        isLoading: false,
        refetch: jest.fn().mockResolvedValue({
          isLoading: false,
          data: {
            ...mockData,
            'electric sheep': {
              ...mockData['electric sheep'],
              apiConfig: { newProp: true },
            },
          },
        }),
      } as unknown as UseQueryResult<Record<string, Conversation>, unknown>);
      renderAssistant();

      const previousConversationButton = screen.getByLabelText('Previous conversation');
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });
      expect(chatSendSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          currentConversation: {
            ...mockData['electric sheep'],
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
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(WELCOME_CONVERSATION_TITLE);
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
