/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssistantConversationBanner } from '.';
import { AIConnector, Conversation, useAssistantContext } from '../../..';
import { customConvo } from '../../mock/conversation';

jest.mock('../../..');

jest.mock('../../connectorland/connector_missing_callout', () => ({
  ConnectorMissingCallout: () => <div data-test-subj="connector-missing-callout" />,
}));

jest.mock('./elastic_llm_callout', () => ({
  ElasticLlmCallout: () => <div data-test-subj="elastic-llm-callout" />,
}));

describe('AssistantConversationBanner', () => {
  const setIsSettingsModalVisible = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ConnectorMissingCallout when shouldShowMissingConnectorCallout is true', () => {
    (useAssistantContext as jest.Mock).mockReturnValue({ inferenceEnabled: true });

    render(
      <AssistantConversationBanner
        isSettingsModalVisible={false}
        setIsSettingsModalVisible={setIsSettingsModalVisible}
        shouldShowMissingConnectorCallout={true}
        currentConversation={undefined}
        connectors={[]}
      />
    );

    expect(screen.getByTestId('connector-missing-callout')).toBeInTheDocument();
  });

  it('renders ElasticLlmCallout when Elastic LLM is enabled', () => {
    (useAssistantContext as jest.Mock).mockReturnValue({ inferenceEnabled: true });
    const mockConnectors = [
      { id: 'mockLLM', actionTypeId: '.inference', isPreconfigured: true },
    ] as AIConnector[];

    const mockConversation = {
      ...customConvo,
      id: 'mockConversation',
      apiConfig: {
        connectorId: 'mockLLM',
        actionTypeId: '.inference',
      },
    } as Conversation;

    render(
      <AssistantConversationBanner
        isSettingsModalVisible={false}
        setIsSettingsModalVisible={setIsSettingsModalVisible}
        shouldShowMissingConnectorCallout={false}
        currentConversation={mockConversation}
        connectors={mockConnectors}
      />
    );

    expect(screen.getByTestId('elastic-llm-callout')).toBeInTheDocument();
  });

  it('renders nothing when no conditions are met', () => {
    (useAssistantContext as jest.Mock).mockReturnValue({ inferenceEnabled: false });

    const { container } = render(
      <AssistantConversationBanner
        isSettingsModalVisible={false}
        setIsSettingsModalVisible={setIsSettingsModalVisible}
        shouldShowMissingConnectorCallout={false}
        currentConversation={undefined}
        connectors={[]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
