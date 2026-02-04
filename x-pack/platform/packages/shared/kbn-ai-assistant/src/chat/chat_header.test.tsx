/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from './chat_header';

jest.mock('@kbn/observability-ai-assistant-plugin/public', () => ({
  AIAgentTourCallout: jest.fn(({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="ai-agent-tour-callout">{children}</div>
  )),
  useAIAgentTourDismissed: jest.fn(),
}));

import * as ObservabilityAIAssistantPublic from '@kbn/observability-ai-assistant-plugin/public';

jest.mock('./chat_actions_menu', () => ({
  ChatActionsMenu: () => <div data-test-subj="chat-actions-menu" />,
}));

jest.mock('./chat_sharing_menu', () => ({
  ChatSharingMenu: () => <div data-test-subj="chat-sharing-menu" />,
}));

jest.mock('./chat_context_menu', () => ({
  ChatContextMenu: () => <div data-test-subj="chat-context-menu" />,
}));

describe('ChatHeader', () => {
  const useAIAgentTourDismissedMock =
    ObservabilityAIAssistantPublic.useAIAgentTourDismissed as unknown as jest.Mock;
  const aiAgentTourCalloutMock =
    ObservabilityAIAssistantPublic.AIAgentTourCallout as unknown as jest.Mock;

  const baseProps = {
    conversationId: 'abc',
    conversation: {
      conversation: { title: 't', id: 'sample-id', last_updated: '2025-05-13T10:00:00Z' },
      archived: false,
      public: false,
      labels: {},
      numeric_labels: {},
      messages: [],
      namespace: 'default',
      '@timestamp': '2025-05-13T10:00:00Z',
    },
    flyoutPositionMode: undefined,
    licenseInvalid: false,
    loading: false,
    title: 'My title',
    isConversationOwnedByCurrentUser: false,
    isConversationApp: false,
    onDuplicateConversation: jest.fn(),
    onSaveTitle: jest.fn(),
    onToggleFlyoutPositionMode: jest.fn(),
    navigateToConversation: jest.fn(),
    updateDisplayedConversation: jest.fn(),
    handleConversationAccessUpdate: jest.fn(),
    deleteConversation: jest.fn(),
    copyConversationToClipboard: jest.fn(),
    copyUrl: jest.fn(),
    handleArchiveConversation: jest.fn(),
    navigateToConnectorsManagementApp: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAIAgentTourDismissedMock.mockReturnValue([true, jest.fn()]);
  });

  it('renders the chat actions menu', () => {
    render(
      <ChatHeader
        {...baseProps}
        connectors={{
          connectors: [],
          selectedConnector: undefined,
          loading: false,
          error: undefined,
          selectConnector: (id: string) => {},
          reloadConnectors: () => {},
          getConnector: () => undefined,
          isConnectorSelectionRestricted: false,
        }}
      />
    );

    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
  });

  it('wraps the chat actions menu with the AI agent tour callout when not dismissed', () => {
    useAIAgentTourDismissedMock.mockReturnValue([false, jest.fn()]);

    render(
      <ChatHeader
        {...baseProps}
        connectors={{
          connectors: [],
          selectedConnector: undefined,
          loading: false,
          error: undefined,
          selectConnector: (id: string) => {},
          reloadConnectors: () => {},
          getConnector: () => undefined,
          isConnectorSelectionRestricted: false,
        }}
      />
    );

    expect(screen.getByTestId('ai-agent-tour-callout')).toBeInTheDocument();
    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
  });

  it('passes isConversationApp to the AI agent tour callout', () => {
    useAIAgentTourDismissedMock.mockReturnValue([false, jest.fn()]);

    render(
      <ChatHeader
        {...baseProps}
        isConversationApp={true}
        connectors={{
          connectors: [],
          selectedConnector: undefined,
          loading: false,
          error: undefined,
          selectConnector: (id: string) => {},
          reloadConnectors: () => {},
          getConnector: () => undefined,
          isConnectorSelectionRestricted: false,
        }}
      />
    );

    expect(aiAgentTourCalloutMock).toHaveBeenCalled();
    expect(aiAgentTourCalloutMock.mock.calls[0][0]).toMatchObject({ isConversationApp: true });
  });
});
