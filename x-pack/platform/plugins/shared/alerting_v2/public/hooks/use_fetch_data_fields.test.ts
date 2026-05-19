/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchDataFields } from './use_fetch_data_fields';

const mockFetchDataFields = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ fetchDataFields: mockFetchDataFields }),
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

describe('useFetchDataFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchDataFields.mockResolvedValue([]);
  });

  it('calls fetchDataFields with undefined when no matcher is provided', async () => {
    const Wrapper = createWrapper();
    renderHook(() => useFetchDataFields(), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetchDataFields).toHaveBeenCalledTimes(1));
    expect(mockFetchDataFields).toHaveBeenCalledWith(undefined);
  });

  it('forwards the matcher to fetchDataFields', async () => {
    const Wrapper = createWrapper();
    renderHook(() => useFetchDataFields('rule.id : "abc"'), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetchDataFields).toHaveBeenCalledTimes(1));
    expect(mockFetchDataFields).toHaveBeenCalledWith('rule.id : "abc"');
  });

  it('treats whitespace-only matcher as undefined', async () => {
    const Wrapper = createWrapper();
    renderHook(() => useFetchDataFields('   '), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetchDataFields).toHaveBeenCalledTimes(1));
    expect(mockFetchDataFields).toHaveBeenCalledWith(undefined);
  });

  it('returns the data from the API', async () => {
    mockFetchDataFields.mockResolvedValue(['data.host.name', 'data.count']);
    const Wrapper = createWrapper();

    const { result } = renderHook(() => useFetchDataFields(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual(['data.host.name', 'data.count']));
  });

  it('uses different cache entries for different matchers', async () => {
    const Wrapper = createWrapper();

    const { result, rerender } = renderHook(({ matcher }) => useFetchDataFields(matcher), {
      wrapper: Wrapper,
      initialProps: { matcher: 'rule.id : "a"' },
    });

    await waitFor(() => expect(mockFetchDataFields).toHaveBeenCalledTimes(1));
    expect(mockFetchDataFields).toHaveBeenLastCalledWith('rule.id : "a"');

    rerender({ matcher: 'rule.id : "b"' });

    await waitFor(() => expect(mockFetchDataFields).toHaveBeenCalledTimes(2));
    expect(mockFetchDataFields).toHaveBeenLastCalledWith('rule.id : "b"');
    expect(result.current).toBeDefined();
  });
});
