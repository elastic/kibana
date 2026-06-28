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
<<<<<<< HEAD
import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceConnector } from '@kbn/inference-common';
import { AddModelPopover } from './add_model_popover';
import { useConnectors } from '../../hooks/use_connectors';

jest.mock('../../hooks/use_connectors');

const mockUseConnectors = useConnectors as jest.Mock;
=======
import { AddModelPopover } from './add_model_popover';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';

jest.mock('../../hooks/use_inference_endpoints');

const mockUseQueryInferenceEndpoints = useQueryInferenceEndpoints as jest.Mock;
>>>>>>> 9.4

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

<<<<<<< HEAD
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
=======
const mockEndpoints = [
  {
    inference_id: 'ep-1',
    service: 'openai',
    task_type: 'chat_completion',
    service_settings: { model_id: 'gpt-4o' },
  },
  {
    inference_id: 'ep-2',
    service: 'openai',
    task_type: 'chat_completion',
    service_settings: { model_id: 'gpt-4o-mini' },
  },
  {
    inference_id: 'ep-eis',
    service: 'elastic',
    task_type: 'chat_completion',
    service_settings: { model_id: 'claude-sonnet' },
    metadata: {
      display: {
        name: 'Claude Sonnet',
        model_creator: 'Anthropic',
      },
    },
  },
  {
    inference_id: 'ep-eis-no-meta',
    service: 'elastic',
    task_type: 'chat_completion',
    service_settings: { model_id: 'some-model' },
  },
  {
    inference_id: 'ep-embed',
    service: 'elastic',
    task_type: 'text_embedding',
    service_settings: { model_id: 'e5' },
  },
>>>>>>> 9.4
];

describe('AddModelPopover', () => {
  const onAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
<<<<<<< HEAD
    mockUseConnectors.mockReturnValue({ data: mockConnectors });
=======
    mockUseQueryInferenceEndpoints.mockReturnValue({ data: mockEndpoints });
>>>>>>> 9.4
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

<<<<<<< HEAD
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

=======
    expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
  });

  it('filters by task type when provided', () => {
>>>>>>> 9.4
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} taskType="text_embedding" />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

<<<<<<< HEAD
    expect(screen.getByText('Embedding model')).toBeInTheDocument();
    expect(screen.queryByText('OpenAI GPT-4o')).not.toBeInTheDocument();
    expect(screen.queryByText('My OpenAI Connector')).not.toBeInTheDocument();
  });

  it('calls onAdd with the selected connector ID', () => {
=======
    expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument();
  });

  it('uses display name for EIS endpoints with metadata', () => {
>>>>>>> 9.4
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));
<<<<<<< HEAD
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
=======

    expect(screen.getByText('Claude Sonnet')).toBeInTheDocument();
  });

  it('falls back to model_id for EIS endpoints without display metadata', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(screen.getByText('some-model')).toBeInTheDocument();
  });

  it('calls onAdd with the selected endpoint inference_id', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));
    fireEvent.click(screen.getByText('gpt-4o-mini'));

    expect(onAdd).toHaveBeenCalledWith('ep-2');
  });

  it('shows disambiguation suffix when multiple endpoints share a model name', () => {
    const duplicateEndpoints = [
      {
        inference_id: 'ep-a',
        service: 'openai',
        task_type: 'chat_completion',
        service_settings: { model_id: 'gpt-4o' },
      },
      {
        inference_id: 'ep-b',
        service: 'openai',
        task_type: 'chat_completion',
        service_settings: { model_id: 'gpt-4o' },
      },
    ];
    mockUseQueryInferenceEndpoints.mockReturnValue({ data: duplicateEndpoints });
>>>>>>> 9.4

    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

<<<<<<< HEAD
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

  describe('deprecated connectors', () => {
    const deprecatedConnector = createConnector({
      connectorId: 'ep-dep',
      name: 'Deprecated Model',
      type: InferenceConnectorType.Inference,
      config: { taskType: 'chat_completion', service: 'elastic' },
      isInferenceEndpoint: true,
      metadata: { heuristics: { status: 'deprecated', end_of_life_date: '2099-01-01' } },
    });
    const eolConnector = createConnector({
      connectorId: 'ep-eol',
      name: 'EOL Model',
      type: InferenceConnectorType.Inference,
      config: { taskType: 'chat_completion', service: 'elastic' },
      isInferenceEndpoint: true,
      metadata: { heuristics: { status: 'deprecated', end_of_life_date: '2020-01-01' } },
    });
    const gaConnector = createConnector({
      connectorId: 'ep-ga',
      name: 'GA Model',
      type: InferenceConnectorType.Inference,
      config: { taskType: 'chat_completion', service: 'elastic' },
      isInferenceEndpoint: true,
      metadata: { heuristics: { status: 'ga' } },
    });

    beforeEach(() => {
      mockUseConnectors.mockReturnValue({
        data: [deprecatedConnector, eolConnector, gaConnector],
      });
    });

    it('disables the EOL connector option', () => {
      render(
        <Wrapper>
          <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('add-model-button'));

      const eolOption = screen.getByText('EOL Model').closest('[role="option"]');
      expect(eolOption).toHaveAttribute('aria-disabled', 'true');

      fireEvent.click(screen.getByText('EOL Model'));
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('keeps the deprecated connector option selectable', () => {
      render(
        <Wrapper>
          <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('add-model-button'));

      const deprecatedOption = screen.getByText('Deprecated Model').closest('[role="option"]');
      expect(deprecatedOption).not.toHaveAttribute('aria-disabled', 'true');

      fireEvent.click(screen.getByText('Deprecated Model'));
      expect(onAdd).toHaveBeenCalledWith('ep-dep');
    });

    it('renders an icon-only status badge for deprecated and EOL connectors, but none for GA', () => {
      render(
        <Wrapper>
          <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('add-model-button'));

      expect(screen.getByTestId('modelDeprecatedBadge-ep-dep')).toBeInTheDocument();
      expect(screen.getByTestId('modelEolBadge-ep-eol')).toBeInTheDocument();
      expect(screen.queryByTestId('modelDeprecatedBadge-ep-ga')).not.toBeInTheDocument();
      expect(screen.queryByTestId('modelEolBadge-ep-ga')).not.toBeInTheDocument();
      expect(screen.queryByTestId('modelPreviewBadge-ep-ga')).not.toBeInTheDocument();
    });
  });

  it('has an accessible name for the model selection popover', () => {
    render(
      <Wrapper>
        <AddModelPopover existingEndpointIds={[]} onAdd={onAdd} />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('add-model-button'));

    // Verify the dialog has an aria-label for screen readers
    const dialog = screen.getByRole('dialog', { name: 'Model selection' });
    expect(dialog).toBeInTheDocument();
=======
    expect(screen.getByText('gpt-4o (ep-a)')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o (ep-b)')).toBeInTheDocument();
>>>>>>> 9.4
  });
});
