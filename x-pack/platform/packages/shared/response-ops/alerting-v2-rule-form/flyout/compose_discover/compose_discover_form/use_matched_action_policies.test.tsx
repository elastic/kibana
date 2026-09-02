/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useMatchedActionPolicies } from './use_matched_action_policies';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMatchedActionPolicies', () => {
  it('returns items from the API on success', async () => {
    const http = httpServiceMock.createStartContract();
    const fakeResponse = {
      items: [{ actionPolicy: { id: 'ap-1', name: 'Policy 1' }, category: 'tags' }],
      total: 42,
    };
    http.fetch.mockResolvedValueOnce(fakeResponse as any);

    const { result } = renderHook(() => useMatchedActionPolicies({ http, tags: ['env:prod'] }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.items).toEqual(fakeResponse.items);
    expect(result.current.total).toBe(42);
    expect(http.fetch).toHaveBeenCalledWith(
      '/api/alerting/v2/action_policies/_match_for_rule',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rule: { tags: ['env:prod'] } }),
      })
    );
  });

  it('captures error when the API call fails', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMatchedActionPolicies({ http, tags: ['env:prod'] }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('re-fetches when tags change', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch
      .mockResolvedValueOnce({
        items: [{ actionPolicy: { id: 'ap-1' }, category: 'tags' }],
      } as any)
      .mockResolvedValueOnce({
        items: [{ actionPolicy: { id: 'ap-2' }, category: 'catch-all' }],
      } as any);

    const { result, rerender } = renderHook(
      ({ tags }: { tags: string[] }) => useMatchedActionPolicies({ http, tags }),
      { wrapper: createWrapper(), initialProps: { tags: ['env:prod'] } }
    );

    await waitFor(() => expect(result.current.items[0].actionPolicy.id).toBe('ap-1'));

    rerender({ tags: ['env:staging'] });
    await waitFor(() => expect(result.current.items[0].actionPolicy.id).toBe('ap-2'));

    expect(http.fetch).toHaveBeenCalledTimes(2);
  });

  it('fires a request with an empty rule body when no tags are provided', async () => {
    const http = httpServiceMock.createStartContract();
    const fakeResponse = {
      items: [{ actionPolicy: { id: 'ap-global', name: 'Global Policy' }, category: 'catch-all' }],
    };
    http.fetch.mockResolvedValueOnce(fakeResponse as any);

    const { result } = renderHook(() => useMatchedActionPolicies({ http }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual(fakeResponse.items);
    expect(http.fetch).toHaveBeenCalledWith(
      '/api/alerting/v2/action_policies/_match_for_rule',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rule: {} }),
      })
    );
  });
});
