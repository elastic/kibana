/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from './chat_header';
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
});
