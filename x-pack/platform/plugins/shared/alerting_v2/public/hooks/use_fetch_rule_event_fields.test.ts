/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchRuleEventFields } from './use_fetch_rule_event_fields';

const mockFetchRuleEventFields = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ fetchRuleEventFields: mockFetchRuleEventFields }),
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: <T>(value: T) => value,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFetchRuleEventFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRuleEventFields.mockResolvedValue([]);
  });

  it('calls fetchRuleEventFields with undefined when no matcher is provided', async () => {
    const Wrapper = createWrapper();
    renderHook(() => useFetchRuleEventFields(), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetchRuleEventFields).toHaveBeenCalledTimes(1));
    expect(mockFetchRuleEventFields).toHaveBeenCalledWith(undefined);
  });

  it('forwards the matcher to fetchRuleEventFields', async () => {
    const Wrapper = createWrapper();
    renderHook(() => useFetchRuleEventFields('rule.id : "abc"'), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetchRuleEventFields).toHaveBeenCalledTimes(1));
    expect(mockFetchRuleEventFields).toHaveBeenCalledWith('rule.id : "abc"');
  });

  it('treats whitespace-only matcher as undefined', async () => {
    const Wrapper = createWrapper();
    renderHook(() => useFetchRuleEventFields('   '), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetchRuleEventFields).toHaveBeenCalledTimes(1));
    expect(mockFetchRuleEventFields).toHaveBeenCalledWith(undefined);
  });

  it('returns the data from the API', async () => {
    mockFetchRuleEventFields.mockResolvedValue(['data.host.name', 'data.count']);
    const Wrapper = createWrapper();

    const { result } = renderHook(() => useFetchRuleEventFields(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(['data.host.name', 'data.count']));
  });

  it('uses different cache entries for different matchers', async () => {
    const Wrapper = createWrapper();

    const { result, rerender } = renderHook(({ matcher }) => useFetchRuleEventFields(matcher), {
      wrapper: Wrapper,
      initialProps: { matcher: 'rule.id : "a"' },
    });

    await waitFor(() => expect(mockFetchRuleEventFields).toHaveBeenCalledTimes(1));
    expect(mockFetchRuleEventFields).toHaveBeenLastCalledWith('rule.id : "a"');

    rerender({ matcher: 'rule.id : "b"' });

    await waitFor(() => expect(mockFetchRuleEventFields).toHaveBeenCalledTimes(2));
    expect(mockFetchRuleEventFields).toHaveBeenLastCalledWith('rule.id : "b"');
    expect(result.current).toBeDefined();
  });
});
