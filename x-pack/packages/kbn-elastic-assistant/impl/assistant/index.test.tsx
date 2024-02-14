/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { Assistant } from '.';
import type { IHttpFetchError } from '@kbn/core/public';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

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

jest.mock('../connectorland/use_load_connectors');
jest.mock('../connectorland/connector_setup');
jest.mock('react-use');

jest.mock('./prompt_editor', () => ({ PromptEditor: jest.fn() }));
jest.mock('./quick_prompts/quick_prompts', () => ({ QuickPrompts: jest.fn() }));
jest.mock('./api/conversations/use_fetch_current_user_conversations');

const renderAssistant = (extraProps = {}, providerProps = {}) =>
  render(
    <TestProviders>
      <Assistant {...extraProps} />
    </TestProviders>
  );

describe('Assistant', () => {
  beforeAll(() => {
    jest.mocked(useConnectorSetup).mockReturnValue({
      comments: [],
      prompt: <></>,
    });

    jest.mocked(PromptEditor).mockReturnValue(null);
    jest.mocked(QuickPrompts).mockReturnValue(null);
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

  describe('when selected conversation changes and some connectors are loaded', () => {
    it('should persist the conversation title to local storage', async () => {
      const connectors: unknown[] = [{}];

      jest.mocked(useLoadConnectors).mockReturnValue({
        isSuccess: true,
        data: connectors,
      } as unknown as UseQueryResult<ActionConnector[], IHttpFetchError>);

      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          Welcome: {
            id: 'Welcome Id',
            title: 'Welcome',
            category: 'assistant',
            messages: [],
            apiConfig: {},
          },
          'electric sheep': {
            id: 'electric sheep id',
            title: 'electric sheep',
            category: 'assistant',
            messages: [],
            apiConfig: {},
          },
        },
        isLoading: false,
        refetch: jest.fn(),
      } as unknown as UseQueryResult<Record<string, Conversation>, unknown>);

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
      const connectors: unknown[] = [{}];

      jest.mocked(useLoadConnectors).mockReturnValue({
        isSuccess: true,
        data: connectors,
      } as unknown as UseQueryResult<ActionConnector[], IHttpFetchError>);

      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          Welcome: {
            id: 'Welcome Id',
            title: 'Welcome',
            category: 'assistant',
            messages: [],
            apiConfig: {},
          },
          'electric sheep': {
            id: 'electric sheep id',
            category: 'assistant',
            title: 'electric sheep',
            messages: [],
            apiConfig: {},
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
      const connectors: unknown[] = [{}];
      const setConversationTitle = jest.fn();
      jest.mocked(useLoadConnectors).mockReturnValue({
        isSuccess: true,
        data: connectors,
      } as unknown as UseQueryResult<ActionConnector[], IHttpFetchError>);

      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          Welcome: {
            id: 'Welcome Id',
            title: 'Welcome',
            category: 'assistant',
            messages: [],
            apiConfig: {},
          },
          'electric sheep': {
            id: 'electric sheep id',
            category: 'assistant',
            title: 'electric sheep',
            messages: [],
            apiConfig: {},
          },
        },
        isLoading: false,
        refetch: jest.fn(),
      } as unknown as UseQueryResult<Record<string, Conversation>, unknown>);

      renderAssistant({ setConversationTitle });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Previous conversation'));
      });

      expect(setConversationTitle).toHaveBeenLastCalledWith('electric sheep');
    });
  });

  describe('when no connectors are loaded', () => {
    it('should set welcome conversation id in local storage', async () => {
      const emptyConnectors: unknown[] = [];

      jest.mocked(useLoadConnectors).mockReturnValue({
        isSuccess: true,
        data: emptyConnectors,
      } as unknown as UseQueryResult<ActionConnector[], IHttpFetchError>);

      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          Welcome: {
            id: 'Welcome',
            title: 'Welcome',
            category: 'assistant',
            messages: [],
            apiConfig: {},
          },
          'electric sheep': {
            id: 'electric sheep',
            title: 'electric sheep',
            category: 'assistant',
            messages: [],
            apiConfig: {},
          },
        },
        isLoading: false,
        refetch: jest.fn(),
      } as unknown as UseQueryResult<Record<string, Conversation>, unknown>);

      renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(WELCOME_CONVERSATION_TITLE);
    });
  });

  describe('when not authorized', () => {
    it('should be disabled', async () => {
      jest.mocked(useFetchCurrentUserConversations).mockReturnValue({
        data: {
          Welcome: {
            id: 'Welcome',
            title: 'Welcome',
            category: 'assistant',
            messages: [],
            apiConfig: {},
          },
          'electric sheep': {
            category: 'assistant',
            id: 'electric sheep',
            title: 'electric sheep',
            messages: [],
            apiConfig: {},
          },
        },
        isLoading: false,
        refetch: jest.fn(),
      } as unknown as UseQueryResult<Record<string, Conversation>, unknown>);

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
