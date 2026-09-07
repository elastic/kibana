/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { EndpointInfo } from './endpoint_info';

// Mock document.execCommand for EUI's copy functionality
const mockExecCommand = jest.fn().mockReturnValue(true);
Object.defineProperty(document, 'execCommand', {
  value: mockExecCommand,
  writable: true,
});

const renderEndpointInfo = (props: { inferenceId: string; endpointInfo: any }) => {
  return render(
    <EuiThemeProvider>
      <EndpointInfo {...props} />
    </EuiThemeProvider>
  );
};

describe('EndpointInfo component tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockExecCommand.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the component with inference id', () => {
    const mockProvider = {
      inference_id: 'cohere-2',
      task_type: 'text_embedding',
      service: 'cohere',
      service_settings: {
        similarity: 'cosine',
        dimensions: 384,
        model_id: 'embed-english-light-v3.0',
        rate_limit: {
          requests_per_minute: 10000,
        },
        embedding_type: 'byte',
      },
      task_settings: {},
    } as any;

    renderEndpointInfo({ inferenceId: 'cohere-2', endpointInfo: mockProvider });

    expect(screen.getByText('cohere-2')).toBeInTheDocument();
  });

  it('renders correctly without model_id in service_settings', () => {
    const mockProvider = {
      inference_id: 'azure-openai-1',
      task_type: 'text_embedding',
      service: 'azureopenai',
      service_settings: {
        resource_name: 'resource-xyz',
        deployment_id: 'deployment-123',
        api_version: 'v1',
      },
    } as any;

    renderEndpointInfo({ inferenceId: 'azure-openai-1', endpointInfo: mockProvider });

    expect(screen.getByText('azure-openai-1')).toBeInTheDocument();
  });

  it('renders with tech preview badge when endpoint is reranker type', () => {
    const mockProvider = {
      inference_id: 'elastic-rerank',
      task_type: 'rerank',
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 1,
        num_threads: 1,
        model_id: '.rerank-v1',
      },
      task_settings: {
        return_documents: true,
      },
    } as any;

    renderEndpointInfo({ inferenceId: 'elastic-rerank', endpointInfo: mockProvider });

    expect(screen.getByText('elastic-rerank')).toBeInTheDocument();
    expect(screen.getByTestId('techPreviewBadge')).toBeInTheDocument();
  });

  describe('task type badge', () => {
    it('renders the task type badge for the endpoint', () => {
      const mockProvider = {
        inference_id: 'my-endpoint',
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: {},
        task_settings: {},
      } as any;

      renderEndpointInfo({ inferenceId: 'my-endpoint', endpointInfo: mockProvider });

      const badge = screen.getByTestId('table-column-task-type-sparse_embedding');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('sparse_embedding');
    });

    it('renders task type badge for different task types', () => {
      const mockProvider = {
        inference_id: 'my-endpoint',
        task_type: 'chat_completion',
        service: 'openai',
        service_settings: {},
        task_settings: {},
      } as any;

      renderEndpointInfo({ inferenceId: 'my-endpoint', endpointInfo: mockProvider });

      const badge = screen.getByTestId('table-column-task-type-chat_completion');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('chat_completion');
    });
  });

  describe('preconfigured badge', () => {
    it('renders the preconfigured badge for preconfigured endpoints', () => {
      const mockProvider = {
        inference_id: '.elser-2-elasticsearch',
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: {
          model_id: '.elser_model_2',
        },
      } as any;

      renderEndpointInfo({
        inferenceId: '.elser-2-elasticsearch',
        endpointInfo: mockProvider,
      });

      const badge = screen.getByTestId('preconfiguredBadge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('PRECONFIGURED');
    });

    it('does not render preconfigured badge for non-preconfigured endpoints', () => {
      const mockProvider = {
        inference_id: 'custom-endpoint',
        task_type: 'text_embedding',
        service: 'openai',
        service_settings: {},
      } as any;

      renderEndpointInfo({ inferenceId: 'custom-endpoint', endpointInfo: mockProvider });

      expect(screen.queryByTestId('preconfiguredBadge')).not.toBeInTheDocument();
    });
  });

  describe('multiple badges together', () => {
    it('renders task type, preconfigured, and tech preview badges for a preconfigured reranker endpoint', () => {
      const mockProvider = {
        inference_id: '.rerank-v1-elastic',
        task_type: 'rerank',
        service: 'elastic',
        service_settings: {
          model_id: 'rerank-v1',
        },
      } as any;

      renderEndpointInfo({ inferenceId: '.rerank-v1-elastic', endpointInfo: mockProvider });

      expect(screen.getByTestId('table-column-task-type-rerank')).toBeInTheDocument();
      expect(screen.getByTestId('preconfiguredBadge')).toBeInTheDocument();
      expect(screen.getByTestId('techPreviewBadge')).toBeInTheDocument();
    });

    it('renders task type and preconfigured badges without tech preview for a preconfigured non-reranker endpoint', () => {
      const mockProvider = {
        inference_id: '.elser-2-elasticsearch',
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: {
          model_id: '.elser_model_2',
        },
      } as any;

      renderEndpointInfo({
        inferenceId: '.elser-2-elasticsearch',
        endpointInfo: mockProvider,
      });

      expect(screen.getByTestId('table-column-task-type-sparse_embedding')).toBeInTheDocument();
      expect(screen.getByTestId('preconfiguredBadge')).toBeInTheDocument();
      expect(screen.queryByTestId('techPreviewBadge')).not.toBeInTheDocument();
    });

    it('renders only the task type badge for a non-preconfigured, non-tech-preview endpoint', () => {
      const mockProvider = {
        inference_id: 'custom-endpoint',
        task_type: 'text_embedding',
        service: 'openai',
        service_settings: {},
      } as any;

      renderEndpointInfo({ inferenceId: 'custom-endpoint', endpointInfo: mockProvider });

      expect(screen.getByTestId('table-column-task-type-text_embedding')).toBeInTheDocument();
      expect(screen.queryByTestId('preconfiguredBadge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('techPreviewBadge')).not.toBeInTheDocument();
    });
  });

  describe('tooltip content', () => {
    it.each([
      ['text_embedding', 'Converts text into dense vector representations for semantic search'],
      ['sparse_embedding', 'Converts text into sparse vector representations for semantic search'],
      ['rerank', 'Re-ranks search results by relevance'],
      ['completion', 'Generates text completions from a given input'],
      ['chat_completion', 'Generates conversational responses from a chat input'],
    ])('shows correct tooltip for %s task type', async (taskType, expectedTooltip) => {
      const mockProvider = {
        inference_id: 'test-endpoint',
        task_type: taskType,
        service: 'elasticsearch',
        service_settings: {},
      } as any;

      renderEndpointInfo({ inferenceId: 'test-endpoint', endpointInfo: mockProvider });

      const badge = screen.getByTestId(`table-column-task-type-${taskType}`);
      fireEvent.mouseOver(badge);

      await waitFor(() => {
        expect(screen.getByText(expectedTooltip)).toBeInTheDocument();
      });
    });
  });

  describe('preconfigured and tech preview tooltips', () => {
    it('shows tooltip for preconfigured badge on hover', async () => {
      const mockProvider = {
        inference_id: '.elser-2-elasticsearch',
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: {
          model_id: '.elser_model_2',
        },
      } as any;

      renderEndpointInfo({
        inferenceId: '.elser-2-elasticsearch',
        endpointInfo: mockProvider,
      });

      const badge = screen.getByTestId('preconfiguredBadge');
      fireEvent.mouseOver(badge);

      await waitFor(() => {
        expect(
          screen.getByText('This endpoint is preconfigured by Elastic and cannot be deleted')
        ).toBeInTheDocument();
      });
    });

    it('shows tooltip for tech preview badge on hover', async () => {
      const mockProvider = {
        inference_id: 'elastic-rerank',
        task_type: 'rerank',
        service: 'elasticsearch',
        service_settings: {
          model_id: '.rerank-v1',
        },
      } as any;

      renderEndpointInfo({ inferenceId: 'elastic-rerank', endpointInfo: mockProvider });

      const badge = screen.getByTestId('techPreviewBadge');
      fireEvent.mouseOver(badge);

      await waitFor(() => {
        expect(
          screen.getByText(
            'This functionality is experimental and not supported. It may change or be removed at any time.'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('copy to clipboard functionality', () => {
    const mockProvider = {
      inference_id: 'test-endpoint',
      task_type: 'text_embedding',
      service: 'elasticsearch',
      service_settings: {},
      task_settings: {},
    } as any;

    it('renders copy button with correct aria-label', () => {
      renderEndpointInfo({ inferenceId: 'test-endpoint', endpointInfo: mockProvider });

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).toHaveAttribute('aria-label', 'Copy endpoint ID to clipboard');
    });

    it('copies endpoint ID to clipboard when copy button is clicked', async () => {
      renderEndpointInfo({ inferenceId: 'test-endpoint', endpointInfo: mockProvider });

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockExecCommand).toHaveBeenCalledWith('copy');
      });
    });

    it('shows checkmark icon after successful copy', async () => {
      renderEndpointInfo({ inferenceId: 'test-endpoint', endpointInfo: mockProvider });

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByTestId('inference-endpoint-copy-id-button-copied')).toBeInTheDocument();
      });
    });

    it('reverts to copy icon after 1 second', async () => {
      renderEndpointInfo({ inferenceId: 'test-endpoint', endpointInfo: mockProvider });

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByTestId('inference-endpoint-copy-id-button-copied')).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('inference-endpoint-copy-id-button')).toBeInTheDocument();
      });
    });

    it('is keyboard accessible', () => {
      renderEndpointInfo({ inferenceId: 'test-endpoint', endpointInfo: mockProvider });

      const copyButton = screen.getByTestId('inference-endpoint-copy-id-button');
      expect(copyButton.tagName.toLowerCase()).toBe('button');
    });
  });
});
