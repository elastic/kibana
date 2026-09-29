/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssistantConversationBanner } from '.';
import type { AIConnector, Conversation } from '../../..';
import { useAssistantContext } from '../../..';
import { customConvo } from '../../mock/conversation';

vi.mock('../../..');

vi.mock('../../connectorland/connector_missing_callout', () => {
  const mocked = {
    ConnectorMissingCallout: () => <div data-test-subj="connector-missing-callout" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./elastic_llm_callout', () => {
  const mocked = {
    ElasticLlmCallout: () => <div data-test-subj="elastic-llm-callout" />,
  };
  return { ...mocked, default: mocked };
});

describe('AssistantConversationBanner', () => {
  const setIsSettingsModalVisible = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ConnectorMissingCallout when shouldShowMissingConnectorCallout is true', () => {
    (useAssistantContext as Mock).mockReturnValue({ inferenceEnabled: true });

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
    (useAssistantContext as Mock).mockReturnValue({ inferenceEnabled: true });
    const mockConnectors = [
      { id: 'mockLLM', actionTypeId: '.inference', isPreconfigured: false, isEis: true },
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
    (useAssistantContext as Mock).mockReturnValue({ inferenceEnabled: false });

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
