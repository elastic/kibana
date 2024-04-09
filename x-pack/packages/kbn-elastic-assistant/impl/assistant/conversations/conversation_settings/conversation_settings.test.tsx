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
  [welcomeConvo.title]: { ...welcomeConvo, id: '1234' },
  [alertConvo.title]: { ...alertConvo, id: '12345' },
  [customConvo.title]: { ...customConvo, id: '123' },
};
const onSelectedConversationChange = jest.fn();

const setConversationSettings = jest.fn();
const setConversationsSettingsBulkActions = jest.fn();

const testProps = {
  allSystemPrompts: mockSystemPrompts,
  conversationSettings: mockConvos,
  defaultConnectorId: '123',
  defaultProvider: OpenAiProviderType.OpenAi,
  http: { basePath: { get: jest.fn() } },
  onSelectedConversationChange,
  selectedConversation: mockConvos[welcomeConvo.title],
  setConversationSettings,
  conversationsSettingsBulkActions: {},
  setConversationsSettingsBulkActions,
} as unknown as ConversationSettingsProps;

jest.mock('../../../connectorland/use_load_connectors', () => ({
  useLoadConnectors: () => ({
    data: mockConnectors,
    error: null,
    isSuccess: true,
  }),
}));

const mockConvo = mockConvos[alertConvo.title];
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
        data-test-subj="change-new-convo"
        onClick={() => onConversationSelectionChange({ ...mockConvo, id: '' })}
      />
      <button
        type="button"
        data-test-subj="bad-id-convo"
        onClick={() => onConversationSelectionChange({ ...mockConvo, id: 'not-the-right-id' })}
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
    expect(setConversationSettings).toHaveBeenLastCalledWith({
      ...mockConvos,
      [mockConvos[welcomeConvo.title].id]: {
        ...mockConvos[welcomeConvo.title],
        apiConfig: {
          ...welcomeConvo.apiConfig,
          defaultSystemPromptId: 'mock-superhero-system-prompt-1',
        },
      },
    });
  });

  it('Selecting a system prompt updates the defaultSystemPromptId for the selected conversation when the id does not match the title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings
          {...testProps}
          selectedConversation={{ ...mockConvo, id: 'not-the-right-id' }}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-sp'));
    expect(setConversationSettings).toHaveBeenLastCalledWith({
      ...mockConvos,
      'not-the-right-id': {
        ...mockConvo,
        id: 'not-the-right-id',
        apiConfig: {
          ...mockConvo.apiConfig,
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

    expect(setConversationSettings).toHaveBeenCalled();
    expect(onSelectedConversationChange).toHaveBeenCalledWith(mockConvo);
  });

  it('Selecting a new conversation updates the selected convo and does not update convo settings', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-new-convo'));

    expect(onSelectedConversationChange).toHaveBeenCalledWith({ ...mockConvo, id: '' });
    expect(setConversationsSettingsBulkActions).toHaveBeenCalledWith({
      create: {
        [mockConvo.title]: { ...mockConvo, id: '' },
      },
    });
  });
  it('Selecting an existing conversation updates the selected convo and is added to the convo settings', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-convo-custom'));
    const newConvo = {
      category: 'assistant',
      id: '',
      title: 'Cool new conversation',
      messages: [],
      replacements: {},
    };
    expect(setConversationSettings).toHaveBeenLastCalledWith({
      ...mockConvos,
      [newConvo.title]: newConvo,
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
    const { [customConvo.title]: _, ...rest } = mockConvos;
    expect(setConversationSettings).toHaveBeenLastCalledWith(rest);
  });
  it('Selecting a new connector updates the conversation', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-connector'));
    expect(setConversationSettings).toHaveBeenLastCalledWith({
      ...mockConvos,
      [mockConvos[welcomeConvo.title].id]: {
        ...mockConvos[welcomeConvo.title],
        apiConfig: {
          actionTypeId: mockConnector.actionTypeId,
          connectorId: mockConnector.id,
          model: undefined,
          provider: undefined,
        },
      },
    });
    expect(setConversationsSettingsBulkActions).toHaveBeenLastCalledWith({
      update: {
        [mockConvos[welcomeConvo.title].id]: {
          ...mockConvos[welcomeConvo.title],
          apiConfig: {
            actionTypeId: mockConnector.actionTypeId,
            connectorId: mockConnector.id,
            model: undefined,
            provider: undefined,
          },
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
    expect(setConversationSettings).toHaveBeenLastCalledWith({
      ...mockConvos,
      [mockConvos[welcomeConvo.title].id]: {
        ...mockConvos[welcomeConvo.title],
        apiConfig: {
          ...welcomeConvo.apiConfig,
          model: 'MODEL_GPT_4',
        },
      },
    });
    expect(setConversationsSettingsBulkActions).toHaveBeenLastCalledWith({
      update: {
        [mockConvos[welcomeConvo.title].id]: {
          ...mockConvos[welcomeConvo.title],
          apiConfig: {
            ...welcomeConvo.apiConfig,
            model: 'MODEL_GPT_4',
          },
        },
      },
    });
  });
  it.skip('Selecting a new connector model updates the conversation when the id does not match the title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} selectedConversation={{ ...mockConvo, id: '' }} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-model'));
    expect(setConversationSettings).toHaveBeenLastCalledWith({
      ...mockConvos,
      'not-the-right-id': {
        ...mockConvo,
        id: '',
        apiConfig: {
          ...mockConvo.apiConfig,
          model: 'MODEL_GPT_4',
        },
      },
    });
  });
  it('Selecting a connector with a new id updates the conversation settings', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('bad-id-convo'));
    expect(setConversationSettings).toHaveBeenCalled();
    expect(onSelectedConversationChange).toHaveBeenCalledWith({
      ...mockConvo,
      id: 'not-the-right-id',
    });
    expect(setConversationsSettingsBulkActions).not.toHaveBeenCalled();
  });

  it('Selecting a new connector updates the conversation when the id does not match the title', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConversationSettings
          {...testProps}
          selectedConversation={{ ...mockConvo, id: 'not-the-right-id' }}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-connector'));
    expect(setConversationSettings).toHaveBeenLastCalledWith({
      ...mockConvos,
      'not-the-right-id': {
        ...mockConvo,
        id: 'not-the-right-id',
        apiConfig: {
          actionTypeId: mockConnector.actionTypeId,
          connectorId: mockConnector.id,
          model: undefined,
          provider: undefined,
        },
      },
    });
  });
});
