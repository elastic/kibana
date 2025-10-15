/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { InferenceModelState } from '@kbn/observability-ai-assistant-plugin/public';
import { WelcomeMessage } from './welcome_message';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';

const mockConnectors: UseGenAIConnectorsResult = {
  connectors: [
    {
      id: 'test-connector',
      name: 'Test Connector',
      actionTypeId: '.gen-ai',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      referencedByCount: 0,
    },
  ],
  loading: false,
  selectedConnector: 'test-connector',
  selectConnector: jest.fn(),
  reloadConnectors: jest.fn(),
  getConnector: jest.fn(),
  isConnectorSelectionRestricted: false,
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      triggersActionsUi: {
        getAddConnectorFlyout: jest.fn(() => null),
      },
      observabilityAIAssistant: {
        service: {
          getScreenContexts: jest.fn(() => []),
        },
        useGenAIConnectors: jest.fn(() => mockConnectors),
      },
    },
  }),
}));

const createMockKnowledgeBase = (
  partial: Partial<UseKnowledgeBaseResult> = {}
): UseKnowledgeBaseResult => ({
  isInstalling: false,
  isPolling: false,
  install: jest.fn(),
  warmupModel: jest.fn(),
  isWarmingUpModel: false,
  isProductDocInstalling: false,
  isProductDocUninstalling: false,
  installProductDoc: jest.fn(),
  uninstallProductDoc: jest.fn(),
  status: {
    value: {
      enabled: true,
      errorMessage: undefined,
      inferenceModelState: InferenceModelState.NOT_INSTALLED,
      concreteWriteIndex: undefined,
      currentInferenceId: undefined,
      isReIndexing: false,
      productDocStatus: 'uninstalled',
    },
    loading: false,
    error: undefined,
    refresh: jest.fn(),
  },
  ...partial,
});

describe('WelcomeMessage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a warning callout while knowledge base is re-indexing', async () => {
    const knowledgeBase = createMockKnowledgeBase({
      status: {
        value: {
          inferenceModelState: InferenceModelState.READY,
          enabled: true,
          concreteWriteIndex: 'my-index',
          currentInferenceId: 'inference_id',
          isReIndexing: true,
          productDocStatus: 'uninstalled',
        },
        loading: false,
        error: undefined,
        refresh: jest.fn(),
      },
    });

    const { rerender } = render(
      <WelcomeMessage
        knowledgeBase={knowledgeBase}
        connectors={mockConnectors}
        onSelectPrompt={jest.fn()}
        showElasticLlmCalloutInChat={false}
        showKnowledgeBaseReIndexingCallout={true}
      />
    );

    // Callout is shown during re-indexing
    expect(screen.queryByText(/Re-indexing in progress/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Knowledge base is currently being re-indexed./i)
    ).toBeInTheDocument();

    // Knowledge base finished re-indexing
    const updatedKnowledgeBase = createMockKnowledgeBase({
      status: {
        value: {
          inferenceModelState: InferenceModelState.READY,
          enabled: true,
          concreteWriteIndex: 'my-index',
          currentInferenceId: 'inference_id',
          isReIndexing: false,
          productDocStatus: 'uninstalled',
        },
        loading: false,
        error: undefined,
        refresh: jest.fn(),
      },
    });

    await act(async () => {
      rerender(
        <WelcomeMessage
          knowledgeBase={updatedKnowledgeBase}
          connectors={mockConnectors}
          onSelectPrompt={jest.fn()}
          showElasticLlmCalloutInChat={false}
          showKnowledgeBaseReIndexingCallout={false}
        />
      );
    });

    // Callout is no longer shown
    expect(screen.queryByText(/Re-indexing in progress/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Knowledge base is currently being re-indexed./i)
    ).not.toBeInTheDocument();
  });
});
