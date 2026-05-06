/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceConnector } from '@kbn/inference-common';
import { AddModelPopover } from './add_model_popover';
import { useConnectors } from '../../hooks/use_connectors';

jest.mock('../../hooks/use_connectors');

const mockUseConnectors = useConnectors as jest.Mock;

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <EuiThemeProvider>
        <I18nProvider>{children}</I18nProvider>
      </EuiThemeProvider>
    </QueryClientProvider>
  );
};

const createConnector = (overrides: Partial<InferenceConnector>): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: 'test-connector',
  connectorId: 'test-id',
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
  ...overrides,
});

/**
 * Connectors returned by useConnectors():
 * - Stack connectors (OpenAI, Bedrock, Gemini) — always chat_completion
 * - ES inference endpoints with chat_completion task type
 */
const mockConnectors: InferenceConnector[] = [
  createConnector({
    connectorId: 'ep-1',
    name: 'OpenAI GPT-4o',
    type: InferenceConnectorType.Inference,
    config: { taskType: 'chat_completion', service: 'openai' },
    isInferenceEndpoint: true,
  }),
  createConnector({
    connectorId: 'ep-2',
    name: 'OpenAI GPT-4o-mini',
    type: InferenceConnectorType.Inference,
    config: { taskType: 'chat_completion', service: 'openai' },
    isInferenceEndpoint: true,
  }),
  createConnector({
    connectorId: 'ep-eis',
    name: 'Claude Sonnet',
    type: InferenceConnectorType.Inference,
    config: { taskType: 'chat_completion', service: 'elastic', modelCreator: 'Anthropic' },
    isInferenceEndpoint: true,
    isEis: true,
  }),
  createConnector({
    connectorId: 'stack-openai-1',
    name: 'My OpenAI Connector',
    type: InferenceConnectorType.OpenAI,
    config: { apiProvider: 'OpenAI' },
    isInferenceEndpoint: false,
  }),
  createConnector({
    connectorId: 'stack-bedrock-1',
    name: 'My Bedrock Connector',
    type: InferenceConnectorType.Bedrock,
    config: {},
    isInferenceEndpoint: false,
  }),
  createConnector({
    connectorId: 'stack-gemini-1',
    name: 'My Gemini Connector',
    type: InferenceConnectorType.Gemini,
    config: {},
    isInferenceEndpoint: false,
  }),
];

describe('AddModelPopover', () => {
  const onAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnectors.mockReturnValue({ data: mockConnectors });
  });

  it('renders the add model button', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    expect(screen.getByTestId('add-model-button')).toBeInTheDocument();
  });

  it('opens popover on button click', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByTestId('add-model-search')).toBeInTheDocument();
  });

  it('excludes existing endpoint IDs from the list', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={['ep-1']} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.queryByText('OpenAI GPT-4o')).not.toBeInTheDocument();
    expect(screen.getByText('OpenAI GPT-4o-mini')).toBeInTheDocument();
  });

  it('lists all connectors returned by useConnectors (stack OpenAI, Bedrock, Gemini, and chat_completion endpoints)', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByText('My OpenAI Connector')).toBeInTheDocument();
    expect(screen.getByText('My Bedrock Connector')).toBeInTheDocument();
    expect(screen.getByText('My Gemini Connector')).toBeInTheDocument();
    expect(screen.getByText('OpenAI GPT-4o')).toBeInTheDocument();
  });

  it('when taskType is set, only lists connectors compatible with that task type', () => {
    const withEmbedding = [
      ...mockConnectors,
      createConnector({
        connectorId: 'ep-embed',
        name: 'Embedding model',
        type: InferenceConnectorType.Inference,
        config: { taskType: 'text_embedding', service: 'openai' },
        isInferenceEndpoint: true,
      }),
    ];
    mockUseConnectors.mockReturnValue({ data: withEmbedding });

    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} taskType="text_embedding" />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByText('Embedding model')).toBeInTheDocument();
    expect(screen.queryByText('OpenAI GPT-4o')).not.toBeInTheDocument();
    expect(screen.queryByText('My OpenAI Connector')).not.toBeInTheDocument();
  });

  it('calls onAdd with the selected connector ID', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));
    fireEvent.click(screen.getByText('My Gemini Connector'));

    expect(onAdd).toHaveBeenCalledWith('stack-gemini-1');
  });

  it('shows disambiguation suffix when multiple connectors share a name', () => {
    const duplicateConnectors = [
      createConnector({
        connectorId: 'ep-a',
        name: 'My Connector',
        type: InferenceConnectorType.Inference,
        config: { taskType: 'chat_completion', service: 'openai' },
        isInferenceEndpoint: true,
      }),
      createConnector({
        connectorId: 'ep-b',
        name: 'My Connector',
        type: InferenceConnectorType.Inference,
        config: { taskType: 'chat_completion', service: 'openai' },
        isInferenceEndpoint: true,
      }),
    ];
    mockUseConnectors.mockReturnValue({ data: duplicateConnectors });

    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByText('My Connector (ep-a)')).toBeInTheDocument();
    expect(screen.getByText('My Connector (ep-b)')).toBeInTheDocument();
  });

  it('handles empty connectors gracefully', () => {
    mockUseConnectors.mockReturnValue({ data: [] });

    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByTestId('add-model-search')).toBeInTheDocument();
  });
});
