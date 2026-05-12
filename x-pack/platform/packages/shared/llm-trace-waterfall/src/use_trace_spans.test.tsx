/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { TraceFetcher } from './use_trace_spans';
import { useTraceSpans } from './use_trace_spans';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: PropsWithChildren) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  return {
    queryClient,
    Wrapper,
  };
};

describe('useTraceSpans', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns spans and duration from fetchTrace', async () => {
    const fetchResult = {
      spans: [
        {
          span_id: 'span-1',
          trace_id: 'trace-1',
          name: 'root',
          start_time: '2026-01-01T00:00:00.000Z',
          duration_ms: 500,
        },
      ],
      durationMs: 500,
    };
    const fetchTrace: jest.MockedFunction<TraceFetcher> = jest.fn();
    fetchTrace.mockResolvedValue(fetchResult);
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceSpans('trace-1', { fetchTrace }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchTrace).toHaveBeenCalledTimes(1);
    expect(fetchTrace).toHaveBeenCalledWith('trace-1');
    expect(result.current.error).toBeNull();
    expect(result.current.spans).toEqual(fetchResult.spans);
    expect(result.current.durationMs).toBe(fetchResult.durationMs);

    queryClient.clear();
  });

  it('returns empty state and does not call fetchTrace when traceId is null', async () => {
    const fetchTrace: jest.MockedFunction<TraceFetcher> = jest.fn();
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceSpans(null, { fetchTrace }), { wrapper: Wrapper });

    expect(fetchTrace).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      spans: [],
      durationMs: 0,
      isLoading: false,
      error: null,
    });

    queryClient.clear();
  });

  it('returns query error and no spans when fetchTrace rejects', async () => {
    const error = new Error('boom');
    const fetchTrace: jest.MockedFunction<TraceFetcher> = jest.fn();
    fetchTrace.mockRejectedValue(error);
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceSpans('trace-1', { fetchTrace }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.error).toBe(error));

    expect(fetchTrace).toHaveBeenCalledTimes(1);
    expect(fetchTrace).toHaveBeenCalledWith('trace-1');
    expect(result.current.spans).toEqual([]);
    expect(result.current.durationMs).toBe(0);

    queryClient.clear();
  });

  it('returns empty spans and zero duration when fetchTrace resolves empty payload', async () => {
    const fetchTrace: jest.MockedFunction<TraceFetcher> = jest.fn();
    fetchTrace.mockResolvedValue({ spans: [], durationMs: 0 });
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceSpans('trace-1', { fetchTrace }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchTrace).toHaveBeenCalledTimes(1);
    expect(fetchTrace).toHaveBeenCalledWith('trace-1');
    expect(result.current.spans).toEqual([]);
    expect(result.current.durationMs).toBe(0);
    expect(result.current.error).toBeNull();

    queryClient.clear();
  });
});
