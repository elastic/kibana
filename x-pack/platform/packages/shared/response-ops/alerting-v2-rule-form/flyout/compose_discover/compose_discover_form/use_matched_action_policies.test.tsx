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
      items: [{ actionPolicy: { id: 'ap-1', name: 'Policy 1' }, category: 'global' }],
    };
    http.fetch.mockResolvedValueOnce(fakeResponse as any);

    const { result } = renderHook(() => useMatchedActionPolicies({ http, ruleId: 'rule-abc' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.items).toEqual(fakeResponse.items);
    expect(http.fetch).toHaveBeenCalledWith(
      '/api/alerting/v2/action_policies/_match_for_rule',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rule: { id: 'rule-abc' } }),
      })
    );
  });

  it('captures error when the API call fails', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMatchedActionPolicies({ http, ruleId: 'rule-abc' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('re-fetches when ruleId changes', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch
      .mockResolvedValueOnce({
        items: [{ actionPolicy: { id: 'ap-1' }, category: 'global' }],
      } as any)
      .mockResolvedValueOnce({
        items: [{ actionPolicy: { id: 'ap-2' }, category: 'global-filtered' }],
      } as any);

    const { result, rerender } = renderHook(
      ({ ruleId }: { ruleId: string }) => useMatchedActionPolicies({ http, ruleId }),
      { wrapper: createWrapper(), initialProps: { ruleId: 'rule-1' } }
    );

    await waitFor(() => expect(result.current.items[0].actionPolicy.id).toBe('ap-1'));

    rerender({ ruleId: 'rule-2' });
    await waitFor(() => expect(result.current.items[0].actionPolicy.id).toBe('ap-2'));

    expect(http.fetch).toHaveBeenCalledTimes(2);
  });

  it('sends name and tags when ruleId is not provided', async () => {
    const http = httpServiceMock.createStartContract();
    const fakeResponse = {
      items: [{ actionPolicy: { id: 'ap-global', name: 'Global Policy' }, category: 'global' }],
    };
    http.fetch.mockResolvedValueOnce(fakeResponse as any);

    const { result } = renderHook(
      () => useMatchedActionPolicies({ http, name: 'My Rule', tags: ['env:prod'] }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual(fakeResponse.items);
    expect(http.fetch).toHaveBeenCalledWith(
      '/api/alerting/v2/action_policies/_match_for_rule',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rule: { name: 'My Rule', tags: ['env:prod'] } }),
      })
    );
  });

  it('does not fire a request when all inputs are absent', async () => {
    const http = httpServiceMock.createStartContract();

    const { result } = renderHook(() => useMatchedActionPolicies({ http }), {
      wrapper: createWrapper(),
    });

    // Give it time in case the query fires unexpectedly
    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(http.fetch).not.toHaveBeenCalled();
  });

  it('does not fire a request when name is an empty string', async () => {
    const http = httpServiceMock.createStartContract();

    const { result } = renderHook(() => useMatchedActionPolicies({ http, name: '' }), {
      wrapper: createWrapper(),
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(http.fetch).not.toHaveBeenCalled();
  });
});
