/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useAiConnectors } from './use_ai_connectors';

const mockGet = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({ services: { http: { get: mockGet } } }),
}));

describe('useAiConnectors', () => {
  it('lists only the connectors an ai.prompt step can run on, by name', async () => {
    mockGet.mockResolvedValue([
      { id: 'slack', name: 'Alerts channel', connector_type_id: '.slack' },
      { id: 'gpt', name: 'OpenAI', connector_type_id: '.gen-ai' },
      { id: 'claude', name: 'Bedrock Claude', connector_type_id: '.bedrock' },
      { id: 'eis', name: 'Elastic Inference', connector_type_id: '.inference' },
    ]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useAiConnectors(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGet).toHaveBeenCalledWith('/api/actions/connectors', expect.anything());
    expect(result.current.data?.map(({ id }) => id)).toEqual(['claude', 'eis', 'gpt']);
  });
});
