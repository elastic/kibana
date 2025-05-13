/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from './chat_header';
import { hasElasticManagedLlmConnector } from '../utils/has_elastic_managed_llm_connector';
import { ElasticLlmTourCallout } from '@kbn/observability-ai-assistant-plugin/public';

jest.mock('../utils/has_elastic_managed_llm_connector', () => ({
  hasElasticManagedLlmConnector: jest.fn(),
}));

jest.mock('@kbn/observability-ai-assistant-plugin/public', () => ({
  ElasticLlmTourCallout: jest.fn(({ children }) => (
    <div data-test-subj="elastic-llm-tour">{children}</div>
  )),
}));

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Elastic Managed LLM connector tour callout when the connector is present', () => {
    (hasElasticManagedLlmConnector as jest.Mock).mockReturnValue(true);

    render(
      <ChatHeader
        {...baseProps}
        connectors={{
          connectors: [
            {
              id: 'elastic-llm',
              actionTypeId: '.inference',
              name: 'Elastic LLM',
              isPreconfigured: true,
              isDeprecated: false,
              isSystemAction: false,
              config: {
                provider: 'elastic',
                taskType: 'chat_completion',
                inferenceId: '.rainbow-sprinkles-elastic',
                providerConfig: {
                  model_id: 'rainbow-sprinkles',
                },
              },
              referencedByCount: 0,
            },
          ],
          selectedConnector: undefined,
          loading: false,
          error: undefined,
          selectConnector: (id: string) => {},
          reloadConnectors: () => {},
        }}
      />
    );

    expect(screen.getByTestId('elastic-llm-tour')).toBeInTheDocument();
    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
    expect(ElasticLlmTourCallout).toHaveBeenCalled();
  });

  it('does not render the tour callout when the Elastic Managed LLM Connector is not present', () => {
    (hasElasticManagedLlmConnector as jest.Mock).mockReturnValue(false);

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
        }}
      />
    );

    expect(screen.queryByTestId('elastic-llm-tour')).toBeNull();
    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
    expect(ElasticLlmTourCallout).not.toHaveBeenCalled();
  });
});
