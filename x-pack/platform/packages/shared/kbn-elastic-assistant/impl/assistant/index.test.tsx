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

import { UseQueryResult } from '@tanstack/react-query';

import useLocalStorage from 'react-use/lib/useLocalStorage';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { TestProviders } from '../mock/test_providers/test_providers';
import { FetchCurrentUserConversations, useFetchCurrentUserConversations } from './api';
import * as all from './chat_send/use_chat_send';
import { useConversation } from './use_conversation';
import { AIConnector } from '../connectorland/connector_selector';
import {
  FetchAnonymizationFields,
  useFetchAnonymizationFields,
} from './api/anonymization_fields/use_fetch_anonymization_fields';

jest.mock('../connectorland/use_load_connectors');
jest.mock('../connectorland/connector_setup');
jest.mock('react-use/lib/useLocalStorage');
jest.mock('react-use/lib/useSessionStorage');

jest.mock('./quick_prompts/quick_prompts', () => ({ QuickPrompts: jest.fn() }));
jest.mock('./api/conversations/use_fetch_current_user_conversations');
jest.mock('./api/anonymization_fields/use_fetch_anonymization_fields');

jest.mock('./use_conversation');
const apiConfig = { connectorId: '123' };
const fullWelcomeConversation = {
  id: 'welcome_id',
  title: 'Welcome',
  category: 'assistant',
  messages: [],
  apiConfig,
  replacements: {},
  updatedAt: '2024-09-10T22:07:44.915Z',
};
const fullSheepConversation = {
  id: 'electric_sheep_id',
  title: 'electric sheep',
  category: 'assistant',
  messages: [],
  replacements: {},
  apiConfig,
  updatedAt: '2024-10-10T22:07:44.915Z',
};

const mockData = {
  welcome_id: {
    id: fullWelcomeConversation.id,
    title: fullWelcomeConversation.title,
    apiConfig: fullWelcomeConversation.apiConfig,
    updatedAt: fullWelcomeConversation.updatedAt,
  },
  electric_sheep_id: {
    id: fullSheepConversation.id,
    title: fullSheepConversation.title,
    apiConfig: fullSheepConversation.apiConfig,
    updatedAt: fullSheepConversation.updatedAt,
  },
};

const renderAssistant = async (extraProps = {}) => {
  const chatSendSpy = jest.spyOn(all, 'useChatSend');
  const assistant = render(
    <TestProviders>
      <Assistant
        lastConversation={{ id: 'welcome_id' }}
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
        currentConversation: expect.objectContaining({ apiConfig }),
      })
    );
  });
  return assistant;
};
const mockDeleteConvo = jest.fn();
const clearConversation = jest.fn();
const mockUseConversation = {
  clearConversation: clearConversation.mockResolvedValue(fullWelcomeConversation),
  getConversation: jest.fn().mockResolvedValue(fullWelcomeConversation),
  deleteConversation: mockDeleteConvo,
  setApiConfig: jest.fn().mockResolvedValue({}),
};

const mockAnonymizationFields: FetchAnonymizationFields = {
  refetch: jest.fn(),
  data: { page: 1, perPage: 20, total: 0, data: [] },
  isFetching: false,
  isError: false,
  isLoading: false,
  isFetched: true,
};

const refetchResults = jest.fn();
const defaultFetchUserConversations = {
  data: mockData,
  isLoading: false,
  refetch: refetchResults.mockResolvedValue({
    isLoading: false,
    data: {
      pages: [
        {
          page: 1,
          perPage: 28,
          total: 150,
          data: Object.values(mockData),
        },
      ],
    },
  }),
  isFetched: true,
  isFetching: false,
  setPaginationObserver: jest.fn(),
};
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

    jest
      .mocked(useFetchCurrentUserConversations)
      .mockReturnValue(defaultFetchUserConversations as unknown as FetchCurrentUserConversations);
    jest.mocked(useFetchAnonymizationFields).mockReturnValue(mockAnonymizationFields);
    jest
      .mocked(useLocalStorage)
      .mockReturnValue([mockData.welcome_id, persistToLocalStorage] as unknown as ReturnType<
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
      const openConversationMenu = screen.getAllByTestId('aiAssistantFlyoutNavigationToggle')[0];
      await act(async () => {
        fireEvent.click(openConversationMenu);
      });
      // selecting first conversation proves sort by updatedAt is working
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
      const getConversation = jest.fn().mockResolvedValue(fullSheepConversation);
      (useConversation as jest.Mock).mockReturnValue({
        ...mockUseConversation,
        getConversation,
      });
      await renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith({ id: mockData.welcome_id.id });

      const previousConversationButton = (
        await screen.findAllByText(mockData.electric_sheep_id.title)
      )[0];
      expect(previousConversationButton).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });

      expect(persistToLocalStorage).toHaveBeenLastCalledWith({ id: 'electric_sheep_id' });
    });

    it('should fetch current conversation when id has value', async () => {
      const getConversation = jest.fn().mockResolvedValue(fullSheepConversation);
      (useConversation as jest.Mock).mockReturnValue({
        ...mockUseConversation,
        getConversation,
      });
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        ...defaultFetchUserConversations,
        data: {
          ...mockData,
          electric_sheep_id: { ...mockData.electric_sheep_id, title: 'updated title' },
        },
        refetch: refetchResults.mockResolvedValue({
          isLoading: false,
          data: {
            pages: [
              {
                page: 1,
                perPage: 28,
                total: 150,
                data: [
                  mockData.welcome_id,
                  { ...mockData.electric_sheep_id, title: 'updated title' },
                ],
              },
            ],
          },
        }),
      } as unknown as FetchCurrentUserConversations);
      await renderAssistant();

      const previousConversationButton = await screen.findByText('updated title');
      await act(async () => {
        fireEvent.click(previousConversationButton);
      });

      expect(getConversation).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith({ id: 'electric_sheep_id' });
    });
  });

  describe('when no connectors are loaded', () => {
    it('should set welcome conversation id in local storage', async () => {
      await renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();
      expect(persistToLocalStorage).toHaveBeenLastCalledWith({ id: mockData.welcome_id.id });
    });
  });

  describe('when not authorized', () => {
    it('should be disabled', async () => {
      const { queryByTestId } = await renderAssistant({});
      expect(queryByTestId('prompt-textarea')).toHaveProperty('disabled');
    });
  });
});
