/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from './chat_header';

vi.mock('./chat_actions_menu', () => {
  const mocked = {
    ChatActionsMenu: () => <div data-test-subj="chat-actions-menu" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./chat_sharing_menu', () => {
  const mocked = {
    ChatSharingMenu: () => <div data-test-subj="chat-sharing-menu" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./chat_context_menu', () => {
  const mocked = {
    ChatContextMenu: () => <div data-test-subj="chat-context-menu" />,
  };
  return { ...mocked, default: mocked };
});

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
    onDuplicateConversation: vi.fn(),
    onSaveTitle: vi.fn(),
    onToggleFlyoutPositionMode: vi.fn(),
    navigateToConversation: vi.fn(),
    updateDisplayedConversation: vi.fn(),
    handleConversationAccessUpdate: vi.fn(),
    deleteConversation: vi.fn(),
    copyConversationToClipboard: vi.fn(),
    copyUrl: vi.fn(),
    handleArchiveConversation: vi.fn(),
    navigateToModelManagementApp: vi.fn(),
  };

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
