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
  it('returns items and evaluation metadata from the API on success', async () => {
    const http = httpServiceMock.createStartContract();
    const fakeResponse = {
      items: [{ action_policy: { id: 'ap-1', name: 'Policy 1' }, category: 'tags' }],
      evaluated_count: 42,
      is_truncated: false,
    };
    http.fetch.mockResolvedValueOnce(fakeResponse as any);

    const { result } = renderHook(() => useMatchedActionPolicies({ http, tags: ['env:prod'] }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.evaluatedCount).toBe(0);
    expect(result.current.isTruncated).toBe(false);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.items).toEqual(fakeResponse.items);
    expect(result.current.evaluatedCount).toBe(fakeResponse.evaluated_count);
    expect(result.current.isTruncated).toBe(fakeResponse.is_truncated);
    expect(http.fetch).toHaveBeenCalledWith(
      '/internal/alerting/v2/action_policies/_match',
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
    expect(result.current.evaluatedCount).toBe(0);
    expect(result.current.isTruncated).toBe(false);
  });

  it('re-fetches when tags change', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch
      .mockResolvedValueOnce({
        items: [{ action_policy: { id: 'ap-1' }, category: 'tags' }],
        evaluated_count: 1,
        is_truncated: false,
      } as any)
      .mockResolvedValueOnce({
        items: [{ action_policy: { id: 'ap-2' }, category: 'catch_all' }],
        evaluated_count: 1,
        is_truncated: false,
      } as any);

    const { result, rerender } = renderHook(
      ({ tags }: { tags: string[] }) => useMatchedActionPolicies({ http, tags }),
      { wrapper: createWrapper(), initialProps: { tags: ['env:prod'] } }
    );

    await waitFor(() => expect(result.current.items[0].action_policy.id).toBe('ap-1'));

    rerender({ tags: ['env:staging'] });
    await waitFor(() => expect(result.current.items[0].action_policy.id).toBe('ap-2'));

    expect(http.fetch).toHaveBeenCalledTimes(2);
  });

  it('fires a request with an empty rule body when no tags are provided', async () => {
    const http = httpServiceMock.createStartContract();
    const fakeResponse = {
      items: [{ action_policy: { id: 'ap-global', name: 'Global Policy' }, category: 'catch_all' }],
      evaluated_count: 1,
      is_truncated: false,
    };
    http.fetch.mockResolvedValueOnce(fakeResponse as any);

    const { result } = renderHook(() => useMatchedActionPolicies({ http }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual(fakeResponse.items);
    expect(http.fetch).toHaveBeenCalledWith(
      '/internal/alerting/v2/action_policies/_match',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rule: {} }),
      })
    );
  });
});
