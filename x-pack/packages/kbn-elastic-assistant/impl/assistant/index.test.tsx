/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { Assistant } from '.';
import { Conversation } from '../assistant_context/types';
import type { IHttpFetchError } from '@kbn/core/public';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

import { useLoadConnectors } from '../connectorland/use_load_connectors';
import { useConnectorSetup } from '../connectorland/connector_setup';

import { UseQueryResult } from '@tanstack/react-query';
import { WELCOME_CONVERSATION_TITLE } from './use_conversation/translations';

import { useLocalStorage } from 'react-use';
import { PromptEditor } from './prompt_editor';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { TestProviders } from '../mock/test_providers/test_providers';

jest.mock('../connectorland/use_load_connectors');
jest.mock('../connectorland/connector_setup');
jest.mock('react-use');

jest.mock('./prompt_editor', () => ({ PromptEditor: jest.fn() }));
jest.mock('./quick_prompts/quick_prompts', () => ({ QuickPrompts: jest.fn() }));

const MOCK_CONVERSATION_TITLE = 'electric sheep';

const getInitialConversations = (): Record<string, Conversation> => ({
  [WELCOME_CONVERSATION_TITLE]: {
    id: WELCOME_CONVERSATION_TITLE,
    messages: [],
    apiConfig: {},
  },
  [MOCK_CONVERSATION_TITLE]: {
    id: MOCK_CONVERSATION_TITLE,
    messages: [],
    apiConfig: {},
  },
});

const renderAssistant = (extraProps = {}) =>
  render(
    <TestProviders getInitialConversations={getInitialConversations}>
      <Assistant isAssistantEnabled {...extraProps} />
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
    it('should persist the conversation id to local storage', async () => {
      const connectors: unknown[] = [{}];

      jest.mocked(useLoadConnectors).mockReturnValue({
        isSuccess: true,
        data: connectors,
      } as unknown as UseQueryResult<ActionConnector[], IHttpFetchError>);

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

      const { getByLabelText } = render(
        <TestProviders
          getInitialConversations={() => ({
            [WELCOME_CONVERSATION_TITLE]: {
              id: WELCOME_CONVERSATION_TITLE,
              messages: [],
              apiConfig: {},
            },
            [MOCK_CONVERSATION_TITLE]: {
              id: MOCK_CONVERSATION_TITLE,
              messages: [],
              apiConfig: {},
              excludeFromLastConversationStorage: true,
            },
          })}
        >
          <Assistant isAssistantEnabled />
        </TestProviders>
      );

      expect(persistToLocalStorage).toHaveBeenCalled();

      expect(persistToLocalStorage).toHaveBeenLastCalledWith(WELCOME_CONVERSATION_TITLE);

      const previousConversationButton = getByLabelText('Previous conversation');

      expect(previousConversationButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(previousConversationButton);
      });
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(WELCOME_CONVERSATION_TITLE);
    });
    it('should call the setConversationId callback if it is defined and the conversation id changes', async () => {
      const connectors: unknown[] = [{}];
      const setConversationId = jest.fn();
      jest.mocked(useLoadConnectors).mockReturnValue({
        isSuccess: true,
        data: connectors,
      } as unknown as UseQueryResult<ActionConnector[], IHttpFetchError>);

      renderAssistant({ setConversationId });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Previous conversation'));
      });

      expect(setConversationId).toHaveBeenLastCalledWith('electric sheep');
    });
  });

  describe('when no connectors are loaded', () => {
    it('should set welcome conversation id in local storage', async () => {
      const emptyConnectors: unknown[] = [];

      jest.mocked(useLoadConnectors).mockReturnValue({
        isSuccess: true,
        data: emptyConnectors,
      } as unknown as UseQueryResult<ActionConnector[], IHttpFetchError>);

      renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();
      expect(persistToLocalStorage).toHaveBeenLastCalledWith(WELCOME_CONVERSATION_TITLE);
    });
  });
});
