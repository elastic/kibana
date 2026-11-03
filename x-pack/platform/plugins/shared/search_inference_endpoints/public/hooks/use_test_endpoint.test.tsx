/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { useTestEndpoint } from './use_test_endpoint';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockPost = jest.fn();

describe('useTestEndpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { http: { post: mockPost } } });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('posts the message to the test route with the encoded endpoint id', async () => {
    mockPost.mockResolvedValue({ ok: true, latencyMs: 120 });
    const { result } = renderHook(() => useTestEndpoint(), { wrapper });

    result.current.mutate({ inferenceId: 'my endpoint/1', message: 'What is Elasticsearch?' });

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/internal/search_inference_endpoints/endpoints/my%20endpoint%2F1/_test',
        { body: JSON.stringify({ message: 'What is Elasticsearch?' }), version: '1' }
      )
    );
    await waitFor(() => expect(result.current.data).toEqual({ ok: true, latencyMs: 120 }));
  });

  it('includes the documents when testing a rerank endpoint', async () => {
    mockPost.mockResolvedValue({ ok: true, latencyMs: 120 });
    const { result } = renderHook(() => useTestEndpoint(), { wrapper });

    result.current.mutate({
      inferenceId: 'my-reranker',
      message: 'query',
      documents: ['doc one', 'doc two'],
    });

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/internal/search_inference_endpoints/endpoints/my-reranker/_test',
        {
          body: JSON.stringify({ message: 'query', documents: ['doc one', 'doc two'] }),
          version: '1',
        }
      )
    );
  });

  it('posts to the feature route when testing a feature', async () => {
    mockPost.mockResolvedValue({ ok: true, latencyMs: 120 });
    const { result } = renderHook(() => useTestEndpoint(), { wrapper });

    result.current.mutate({ featureId: 'agent builder', message: 'hello' });

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/internal/search_inference_endpoints/features/agent%20builder/_test',
        { body: JSON.stringify({ message: 'hello' }), version: '1' }
      )
    );
  });

  it('posts to the connector route when testing a model by connector id', async () => {
    mockPost.mockResolvedValue({ ok: true, latencyMs: 120 });
    const { result } = renderHook(() => useTestEndpoint(), { wrapper });

    result.current.mutate({ connectorId: 'my connector', message: 'hello' });

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/internal/search_inference_endpoints/connectors/my%20connector/_test',
        { body: JSON.stringify({ message: 'hello' }), version: '1' }
      )
    );
  });
});
