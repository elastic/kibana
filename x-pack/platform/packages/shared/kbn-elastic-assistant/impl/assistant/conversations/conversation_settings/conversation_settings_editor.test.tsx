/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ConversationSettingsEditorProps } from './conversation_settings_editor';
import { ConversationSettingsEditor } from './conversation_settings_editor';
import { mockSystemPrompts } from '../../../mock/system_prompt';
import { welcomeConvo } from '../../../mock/conversation';
import type { HttpSetup } from '@kbn/core-http-browser';
import { TestProviders } from '../../../mock/test_providers/test_providers';

// Mocks for child components
jest.mock('../../prompt_editor/system_prompt/select_system_prompt', () => ({
  SelectSystemPrompt: ({
    onSystemPromptSelectionChange,
  }: {
    onSystemPromptSelectionChange: (p: string) => void;
  }) => (
    <button
      type="button"
      data-test-subj="system-prompt"
      onClick={() => onSystemPromptSelectionChange('prompt-id')}
    >
      {'SelectSystemPrompt'}
    </button>
  ),
}));
jest.mock('../../../connectorland/connector_selector', () => ({
  ConnectorSelector: ({
    onConnectorSelectionChange,
  }: {
    onConnectorSelectionChange: (connector: {
      id: string;
      actionTypeId: string;
      isPreconfigured: boolean;
    }) => void;
  }) => (
    <button
      data-test-subj="connector-selector"
      type="button"
      onClick={() =>
        onConnectorSelectionChange({
          id: 'connector-id',
          actionTypeId: 'action-type',
          isPreconfigured: false,
        })
      }
    >
      {'ConnectorSelector'}
    </button>
  ),
}));
jest.mock('../../../connectorland/models/model_selector/model_selector', () => ({
  ModelSelector: ({ onModelSelectionChange }: { onModelSelectionChange: (s: string) => void }) => (
    <button
      data-test-subj="model-selector"
      type="button"
      onClick={() => onModelSelectionChange('model-id')}
    >
      {'ModelSelector'}
    </button>
  ),
}));
jest.mock('../../share_conversation/share_select', () => ({
  ShareSelect: ({
    onSharedSelectionChange,
  }: {
    onSharedSelectionChange: (s: string, a: Array<{ uid: string }>) => void;
  }) => (
    <button
      data-test-subj="share-select"
      type="button"
      onClick={() => onSharedSelectionChange('Shared', [{ uid: 'user-1' }])}
    >
      {'ShareSelect'}
    </button>
  ),
}));

const mockSetConversationSettings = jest.fn();
const mockSetConversationsSettingsBulkActions = jest.fn();

const baseProps: ConversationSettingsEditorProps = {
  allSystemPrompts: mockSystemPrompts,
  conversationSettings: { [welcomeConvo.id]: welcomeConvo },
  conversationsSettingsBulkActions: {},
  currentUser: { name: 'elastic' },
  http: { basePath: { get: jest.fn(() => 'http://localhost:5601') } } as unknown as HttpSetup,
  isDisabled: false,
  selectedConversation: welcomeConvo,
  setConversationSettings: mockSetConversationSettings,
  setConversationsSettingsBulkActions: mockSetConversationsSettingsBulkActions,
};

describe('ConversationSettingsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <TestProviders>
        <ConversationSettingsEditor {...baseProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('system-prompt')).toBeInTheDocument();
    expect(screen.getByTestId('connector-selector')).toBeInTheDocument();
    expect(screen.getByTestId('model-selector')).toBeInTheDocument();
    expect(screen.getByTestId('share-select')).toBeInTheDocument();
  });

  it('calls setConversationsSettingsBulkActions when system prompt changes', () => {
    render(
      <TestProviders>
        <ConversationSettingsEditor {...baseProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('system-prompt'));
    expect(mockSetConversationsSettingsBulkActions).toHaveBeenCalledWith({
      update: {
        [welcomeConvo.id]: {
          id: welcomeConvo.id,
          apiConfig: { ...welcomeConvo.apiConfig, defaultSystemPromptId: 'prompt-id' },
        },
      },
    });
  });

  it('calls setConversationsSettingsBulkActions when connector changes', () => {
    render(
      <TestProviders>
        <ConversationSettingsEditor {...baseProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('connector-selector'));
    expect(mockSetConversationsSettingsBulkActions).toHaveBeenCalledWith({
      update: {
        [welcomeConvo.id]: {
          id: welcomeConvo.id,
          apiConfig: {
            actionTypeId: 'action-type',
            connectorId: 'connector-id',
            model: undefined,
            provider: undefined,
          },
        },
      },
    });
  });

  it('calls setConversationsSettingsBulkActions when model changes', () => {
    render(
      <TestProviders>
        <ConversationSettingsEditor {...baseProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('model-selector'));
    expect(mockSetConversationsSettingsBulkActions).toHaveBeenCalledWith({
      update: {
        [welcomeConvo.id]: {
          id: welcomeConvo.id,
          apiConfig: { ...welcomeConvo.apiConfig, model: 'model-id' },
        },
      },
    });
  });

  it('calls setConversationsSettingsBulkActions when share selection changes', () => {
    render(
      <TestProviders>
        <ConversationSettingsEditor {...baseProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getByTestId('share-select'));
    expect(mockSetConversationsSettingsBulkActions).toHaveBeenCalledWith({
      update: {
        [welcomeConvo.id]: {
          id: welcomeConvo.id,
          users: [],
        },
      },
    });
  });
});
