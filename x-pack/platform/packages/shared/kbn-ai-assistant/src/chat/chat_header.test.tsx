/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from './chat_header';
import { getElasticManagedLlmConnector } from '@kbn/observability-ai-assistant-plugin/public';
import { ElasticLlmTourCallout } from '@kbn/observability-ai-assistant-plugin/public';

jest.mock('@kbn/observability-ai-assistant-plugin/public', () => ({
  ElasticLlmTourCallout: jest.fn(({ children }) => (
    <div data-test-subj="elastic-llm-tour">{children}</div>
  )),
  getElasticManagedLlmConnector: jest.fn(),
  useElasticLlmCalloutDismissed: jest.fn().mockReturnValue([false, jest.fn()]),
  ElasticLlmCalloutKey: {
    TOUR_CALLOUT: 'tour_callout',
  },
}));

jest.mock('./chat_actions_menu', () => ({
  ChatActionsMenu: () => <div data-test-subj="chat-actions-menu" />,
}));

describe('ChatHeader', () => {
  const baseProps = {
    conversationId: 'abc',
    flyoutPositionMode: undefined,
    licenseInvalid: false,
    loading: false,
    title: 'My title',
    isConversationApp: false,
    onSaveTitle: jest.fn(),
    onToggleFlyoutPositionMode: jest.fn(),
    navigateToConversation: jest.fn(),
    onCopyConversation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Elastic Managed LLM connector tour callout when the connector is present', () => {
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
        }}
      />
    );

    expect(screen.queryByTestId('elastic-llm-tour')).toBeNull();
    expect(screen.getByTestId('chat-actions-menu')).toBeInTheDocument();
    expect(ElasticLlmTourCallout).not.toHaveBeenCalled();
  });
});
