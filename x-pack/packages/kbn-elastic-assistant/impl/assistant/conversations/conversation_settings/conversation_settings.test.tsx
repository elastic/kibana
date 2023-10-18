/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ConversationSettings, ConversationSettingsProps } from './conversation_settings';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { alertConvo, customConvo, welcomeConvo } from '../../../mock/conversation';
import { mockSystemPrompts } from '../../../mock/system_prompt';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { mockConnectors } from '../../../mock/connectors';

const mockConvos = {
  [welcomeConvo.id]: welcomeConvo,
  [alertConvo.id]: alertConvo,
  [customConvo.id]: customConvo,
};
const onSelectedConversationChange = jest.fn();

const setUpdatedConversationSettings = jest.fn().mockImplementation((fn) => {
  return fn(mockConvos);
});

const testProps = {
  allSystemPrompts: mockSystemPrompts,
  conversationSettings: mockConvos,
  defaultConnectorId: '123',
  defaultProvider: OpenAiProviderType.OpenAi,
  http: { basePath: { get: jest.fn() } },
  onSelectedConversationChange,
  selectedConversation: welcomeConvo,
  setUpdatedConversationSettings,
} as unknown as ConversationSettingsProps;

jest.mock('../../../connectorland/use_load_connectors', () => ({
  useLoadConnectors: () => ({
    data: mockConnectors,
    error: null,
    isSuccess: true,
  }),
}));

const mockConvo = alertConvo;
jest.mock('../conversation_selector_settings', () => ({
  // @ts-ignore
  ConversationSelectorSettings: ({ onConversationDeleted, onConversationSelectionChange }) => (
    <>
      <button
        type="button"
        data-test-subj="delete-convo"
        onClick={() => onConversationDeleted('Custom option')}
      />
      <button
        type="button"
        data-test-subj="change-convo"
        onClick={() => onConversationSelectionChange(mockConvo)}
      />
      <button
        type="button"
        data-test-subj="change-convo-custom"
        onClick={() => onConversationSelectionChange('Cool new conversation')}
      />
    </>
  ),
}));
jest.mock('../../prompt_editor/system_prompt/select_system_prompt', () => ({
  // @ts-ignore
  SelectSystemPrompt: ({ onSystemPromptSelectionChange }) => (
    <button
      type="button"
      data-test-subj="change-sp"
      onClick={() => onSystemPromptSelectionChange(mockSystemPrompts[1].id)}
    />
  ),
}));
jest.mock('../../../connectorland/models/model_selector/model_selector', () => ({
  // @ts-ignore
  ModelSelector: ({ onModelSelectionChange }) => (
    <button
      type="button"
      data-test-subj="change-model"
      onClick={() => onModelSelectionChange('MODEL_GPT_4')}
    />
  ),
}));
const mockConnector = {
  id: 'cool-id-bro',
  actionTypeId: '.gen-ai',
  name: 'cool name',
  connectorTypeTitle: 'OpenAI',
};
jest.mock('../../../connectorland/connector_selector', () => ({
  // @ts-ignore
  ConnectorSelector: ({ onConnectorSelectionChange }) => (
    <button
      type="button"
      data-test-subj="change-connector"
      onClick={() => onConnectorSelectionChange(mockConnector)}
    />
  ),
}));

describe('ConversationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Selecting a system prompt updates the defaultSystemPromptId for the selected conversation', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-sp'));
    expect(setUpdatedConversationSettings).toHaveReturnedWith({
      ...mockConvos,
      [welcomeConvo.id]: {
        ...welcomeConvo,
        apiConfig: {
          ...welcomeConvo.apiConfig,
          defaultSystemPromptId: 'mock-superhero-system-prompt-1',
        },
      },
    });
  });

  it('Selecting an existing conversation updates the selected convo and does not update convo settings', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-convo'));

    expect(setUpdatedConversationSettings).toHaveReturnedWith(mockConvos);
    expect(onSelectedConversationChange).toHaveBeenCalledWith(alertConvo);
  });
  it('Selecting an existing conversation updates the selected convo and is added to the convo settings', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-convo-custom'));
    const newConvo = {
      apiConfig: {
        connectorId: '123',
        defaultSystemPromptId: 'default-system-prompt',
        provider: 'OpenAI',
      },
      id: 'Cool new conversation',
      messages: [],
    };
    expect(setUpdatedConversationSettings).toHaveReturnedWith({
      ...mockConvos,
      [newConvo.id]: newConvo,
    });
    expect(onSelectedConversationChange).toHaveBeenCalledWith(newConvo);
  });
  it('Deleting a conversation removes it from the convo settings', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('delete-convo'));
    const { [customConvo.id]: _, ...rest } = mockConvos;
    expect(setUpdatedConversationSettings).toHaveReturnedWith(rest);
  });
  it('Selecting a new connector updates the conversation', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-connector'));
    expect(setUpdatedConversationSettings).toHaveReturnedWith({
      ...mockConvos,
      [welcomeConvo.id]: {
        ...welcomeConvo,
        apiConfig: {
          connectorId: mockConnector.id,
        },
      },
    });
  });
  it('Selecting a new connector model updates the conversation', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-model'));
    expect(setUpdatedConversationSettings).toHaveReturnedWith({
      ...mockConvos,
      [welcomeConvo.id]: {
        ...welcomeConvo,
        apiConfig: {
          ...welcomeConvo.apiConfig,
          model: 'MODEL_GPT_4',
        },
      },
    });
  });
});
