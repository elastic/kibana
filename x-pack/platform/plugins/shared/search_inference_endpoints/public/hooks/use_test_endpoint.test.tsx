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

  it('posts to the test route with the encoded endpoint id', async () => {
    mockPost.mockResolvedValue({ ok: true, latencyMs: 120 });
    const { result } = renderHook(() => useTestEndpoint(), { wrapper });

    result.current.mutate('my endpoint/1');

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/internal/search_inference_endpoints/endpoints/my%20endpoint%2F1/_test',
        { version: '1' }
      )
    );
    await waitFor(() => expect(result.current.data).toEqual({ ok: true, latencyMs: 120 }));
  });

  it('exposes the request error when the test request fails', async () => {
    const requestError = { body: { message: 'Forbidden', statusCode: 403 }, message: 'Forbidden' };
    mockPost.mockRejectedValue(requestError);
    const { result } = renderHook(() => useTestEndpoint(), { wrapper });

    result.current.mutate('my-endpoint');

    await waitFor(() => expect(result.current.error).toBe(requestError));
    expect(result.current.data).toBeUndefined();
  });
});
