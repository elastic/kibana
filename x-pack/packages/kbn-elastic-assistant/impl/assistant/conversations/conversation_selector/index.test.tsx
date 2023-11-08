/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationSelector } from '.';
import { render, fireEvent, within } from '@testing-library/react';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { alertConvo, customConvo, welcomeConvo } from '../../../mock/conversation';
import { CONVERSATION_SELECTOR_PLACE_HOLDER } from './translations';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

const setConversation = jest.fn();
const deleteConversation = jest.fn();
const mockConversation = {
  appendMessage: jest.fn(),
  appendReplacements: jest.fn(),
  clearConversation: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation,
  setApiConfig: jest.fn(),
  setConversation,
};

jest.mock('../../use_conversation', () => ({
  useConversation: () => mockConversation,
}));

const onConversationSelected = jest.fn();
const defaultProps = {
  isDisabled: false,
  onConversationSelected,
  selectedConversationId: 'Welcome',
  defaultConnectorId: '123',
  defaultProvider: OpenAiProviderType.OpenAi,
};
describe('Conversation selector', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders with correct selected conversation', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('conversation-selector')).toBeInTheDocument();
    expect(getByTestId('comboBoxSearchInput')).toHaveValue(welcomeConvo.id);
  });
  it('On change, selects new item', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('comboBoxSearchInput'));
    fireEvent.click(getByTestId(`convo-option-${alertConvo.id}`));
    expect(onConversationSelected).toHaveBeenCalledWith(alertConvo.id);
  });
  it('On clear input, clears selected options', () => {
    const { getByPlaceholderText, queryByPlaceholderText, getByTestId, queryByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('comboBoxSearchInput')).toBeInTheDocument();
    expect(queryByPlaceholderText(CONVERSATION_SELECTOR_PLACE_HOLDER)).not.toBeInTheDocument();
    fireEvent.click(getByTestId('comboBoxClearButton'));
    expect(getByPlaceholderText(CONVERSATION_SELECTOR_PLACE_HOLDER)).toBeInTheDocument();
    expect(queryByTestId('euiComboBoxPill')).not.toBeInTheDocument();
  });

  it('We can add a custom option', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );
    const customOption = 'Custom option';
    fireEvent.change(getByTestId('comboBoxSearchInput'), { target: { value: customOption } });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(setConversation).toHaveBeenCalledWith({
      conversation: {
        id: customOption,
        messages: [],
        apiConfig: {
          connectorId: '123',
          defaultSystemPromptId: undefined,
          provider: 'OpenAI',
        },
      },
    });
  });

  it('Only custom options can be deleted', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
            [customConvo.id]: customConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('comboBoxSearchInput'));
    expect(
      within(getByTestId(`convo-option-${customConvo.id}`)).getByTestId('delete-option')
    ).toBeInTheDocument();
    expect(
      within(getByTestId(`convo-option-${alertConvo.id}`)).queryByTestId('delete-option')
    ).not.toBeInTheDocument();
  });

  it('Custom options can be deleted', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
            [customConvo.id]: customConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('comboBoxSearchInput'));
    fireEvent.click(
      within(getByTestId(`convo-option-${customConvo.id}`)).getByTestId('delete-option')
    );
    jest.runAllTimers();
    expect(onConversationSelected).not.toHaveBeenCalled();

    expect(deleteConversation).toHaveBeenCalledWith(customConvo.id);
  });

  it('Previous conversation is set to active when selected conversation is deleted', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
            [customConvo.id]: customConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} selectedConversationId={customConvo.id} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('comboBoxSearchInput'));
    fireEvent.click(
      within(getByTestId(`convo-option-${customConvo.id}`)).getByTestId('delete-option')
    );
    expect(onConversationSelected).toHaveBeenCalledWith(welcomeConvo.id);
  });

  it('Left arrow selects first conversation', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
            [customConvo.id]: customConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );

    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'ArrowLeft',
      ctrlKey: true,
      code: 'ArrowLeft',
      charCode: 27,
    });
    expect(onConversationSelected).toHaveBeenCalledWith(alertConvo.id);
  });

  it('Right arrow selects last conversation', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
            [customConvo.id]: customConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );

    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'ArrowRight',
      ctrlKey: true,
      code: 'ArrowRight',
      charCode: 26,
    });
    expect(onConversationSelected).toHaveBeenCalledWith(customConvo.id);
  });

  it('Right arrow does nothing when ctrlKey is false', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [alertConvo.id]: alertConvo,
            [welcomeConvo.id]: welcomeConvo,
            [customConvo.id]: customConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );

    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'ArrowRight',
      ctrlKey: false,
      code: 'ArrowRight',
      charCode: 26,
    });
    expect(onConversationSelected).not.toHaveBeenCalled();
  });

  it('Right arrow does nothing when conversation lenth is 1', () => {
    const { getByTestId } = render(
      <TestProviders
        providerContext={{
          getInitialConversations: () => ({
            [welcomeConvo.id]: welcomeConvo,
          }),
        }}
      >
        <ConversationSelector {...defaultProps} />
      </TestProviders>
    );

    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'ArrowRight',
      ctrlKey: true,
      code: 'ArrowRight',
      charCode: 26,
    });
    expect(onConversationSelected).not.toHaveBeenCalled();
  });
});
