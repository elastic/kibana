/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from './chat_header';
import {
  getElasticManagedLlmConnector,
  ElasticLlmTourCallout,
  useObservabilityAIAssistantFlyoutStateContext,
} from '@kbn/observability-ai-assistant-plugin/public';

jest.mock('@kbn/observability-ai-assistant-plugin/public', () => ({
  ElasticLlmTourCallout: jest.fn(({ children }) => (
    <div data-test-subj="elastic-llm-tour">{children}</div>
  )),
  getElasticManagedLlmConnector: jest.fn(),
  useElasticLlmCalloutDismissed: jest.fn().mockReturnValue([false, jest.fn()]),
  useObservabilityAIAssistantFlyoutStateContext: jest.fn().mockReturnValue({ isFlyoutOpen: false }),
  ElasticLlmCalloutKey: {
    TOUR_CALLOUT: 'tour_callout',
  },
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

const elasticManagedConnector = {
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
};

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

  it('shows the Elastic Managed LLM connector tour callout when the connector is present', () => {
    (getElasticManagedLlmConnector as jest.Mock).mockReturnValue(elasticManagedConnector);

    render(
      <ChatHeader
        {...baseProps}
        connectors={{
          connectors: [elasticManagedConnector],
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

    expect(screen.getByTestId('elastic-llm-tour')).toBeInTheDocument();
    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
    expect(ElasticLlmTourCallout).toHaveBeenCalled();
  });

  it('does not render the tour callout when the Elastic Managed LLM Connector is not present', () => {
    (getElasticManagedLlmConnector as jest.Mock).mockReturnValue(undefined);

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

    expect(screen.queryByTestId('elastic-llm-tour')).toBeNull();
    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
    expect(ElasticLlmTourCallout).not.toHaveBeenCalled();
  });

  it('hides the tour callout from the AI Assistant page when the flyout is open', () => {
    (getElasticManagedLlmConnector as jest.Mock).mockReturnValue(elasticManagedConnector);
    (useObservabilityAIAssistantFlyoutStateContext as jest.Mock).mockReturnValue({
      isFlyoutOpen: true,
    });

    render(
      <ChatHeader
        {...baseProps}
        isConversationApp={true}
        connectors={{
          connectors: [elasticManagedConnector],
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

    expect(screen.queryByTestId('elastic-llm-tour')).toBeNull();
    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
    expect(ElasticLlmTourCallout).not.toHaveBeenCalled();
  });

  it('shows the tour callout on the AI Assistant page when the flyout is closed', () => {
    (getElasticManagedLlmConnector as jest.Mock).mockReturnValue(elasticManagedConnector);
    (useObservabilityAIAssistantFlyoutStateContext as jest.Mock).mockReturnValue({
      isFlyoutOpen: false,
    });

    render(
      <ChatHeader
        {...baseProps}
        isConversationApp={true}
        connectors={{
          connectors: [elasticManagedConnector],
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

    expect(screen.getByTestId('elastic-llm-tour')).toBeInTheDocument();
    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
    expect(ElasticLlmTourCallout).toHaveBeenCalled();
  });
});
