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
import { IHttpFetchError } from '@kbn/core/public';
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

const renderAssistant = () =>
  render(
    <TestProviders getInitialConversations={getInitialConversations}>
      <Assistant />
    </TestProviders>
  );

describe('Assistant', () => {
  beforeAll(() => {
    jest.mocked(useConnectorSetup).mockReturnValue({
      connectorDialog: <></>,
      connectorPrompt: <></>,
    });

    jest.mocked(PromptEditor).mockReturnValue(null);
    jest.mocked(QuickPrompts).mockReturnValue(null);
  });

  beforeEach(jest.clearAllMocks);

  let persistToLocalStorage: jest.Mock;

  beforeEach(() => {
    persistToLocalStorage = jest.fn();

    jest
      .mocked(useLocalStorage)
      .mockReturnValue(['', persistToLocalStorage] as unknown as ReturnType<
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
  });

  describe('when no connectors are loaded', () => {
    it('should clear conversation id in local storage', async () => {
      const emptyConnectors: unknown[] = [];

      jest.mocked(useLoadConnectors).mockReturnValue({
        isSuccess: true,
        data: emptyConnectors,
      } as unknown as UseQueryResult<ActionConnector[], IHttpFetchError>);

      renderAssistant();

      expect(persistToLocalStorage).toHaveBeenCalled();
      expect(persistToLocalStorage).toHaveBeenLastCalledWith('');
    });
  });
});
