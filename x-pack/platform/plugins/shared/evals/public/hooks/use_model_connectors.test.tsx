/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useModelConnectors } from './use_model_connectors';

const chatCompletionConnector = {
  id: 'anthropic-claude-4-5-haiku',
  name: 'EIS Anthropic Claude 4.5 Haiku',
  connector_type_id: '.inference',
  config: { taskType: 'chat_completion' },
};

const completionConnector = {
  id: 'anthropic-claude-4-5-haiku-2',
  name: 'EIS Anthropic Claude 4.5 Haiku',
  connector_type_id: '.inference',
  config: { taskType: 'completion' },
};

const renderUseModelConnectors = (connectors: unknown[]) => {
  const http = httpServiceMock.createStartContract();
  http.get.mockResolvedValue(connectors);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <KibanaContextProvider services={{ http }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );

  return renderHook(() => useModelConnectors(), { wrapper });
};

const connectorIdsOf = (connectors: Array<{ id: string }>) => connectors.map(({ id }) => id);

describe('useModelConnectors', () => {
  it('drops .inference connectors that are not chat_completion', async () => {
    const { result } = renderUseModelConnectors([chatCompletionConnector, completionConnector]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // A completion endpoint resolves to nothing at execution time, so offering it would only
    // produce "No connector or inference endpoint found" once an evaluator runs.
    expect(connectorIdsOf(result.current.connectors)).toEqual(['anthropic-claude-4-5-haiku']);
  });

  it('keeps the other model connector types regardless of task type', async () => {
    const { result } = renderUseModelConnectors([
      chatCompletionConnector,
      { id: 'azure-gpt4_1', name: 'azure-gpt-4_1', connector_type_id: '.gen-ai' },
      { id: 'bedrock-claude-4_0', name: 'Claude 4.0', connector_type_id: '.bedrock' },
      { id: 'gemini-25-pro', name: 'gemini-2.5-pro', connector_type_id: '.gemini' },
    ]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(connectorIdsOf(result.current.connectors)).toEqual([
      'anthropic-claude-4-5-haiku',
      'azure-gpt4_1',
      'bedrock-claude-4_0',
      'gemini-25-pro',
    ]);
  });

  it('drops connector types that cannot back a model, and deprecated connectors', async () => {
    const { result } = renderUseModelConnectors([
      chatCompletionConnector,
      { id: 'slack-1', name: 'Slack', connector_type_id: '.slack' },
      {
        id: 'servicenow-legacy',
        name: 'ServiceNow',
        connector_type_id: '.gen-ai',
        is_deprecated: true,
      },
    ]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(connectorIdsOf(result.current.connectors)).toEqual(['anthropic-claude-4-5-haiku']);
  });

  it('falls back to the remaining connectors when none match a known model type', async () => {
    const { result } = renderUseModelConnectors([
      { id: 'custom-1', name: 'Custom model', connector_type_id: '.custom-llm' },
    ]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(connectorIdsOf(result.current.connectors)).toEqual(['custom-1']);
  });

  it('never falls back to an .inference connector that is not chat_completion', async () => {
    const { result } = renderUseModelConnectors([completionConnector]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connectors).toEqual([]);
  });
});
