/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of } from 'rxjs';
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

  it('queries traces and maps spans with computed duration', async () => {
    const search = jest.fn().mockReturnValue(
      of({
        rawResponse: {
          hits: {
            hits: [
              {
                _id: 'span-1',
                _source: {
                  trace_id: 'trace-1',
                  name: 'root',
                  '@timestamp': '2026-01-01T00:00:00.000Z',
                  duration: 2_000_000,
                },
              },
              {
                _id: 'span-2',
                _source: {
                  trace_id: 'trace-1',
                  name: 'child',
                  '@timestamp': '2026-01-01T00:00:00.500Z',
                  duration: 1_000_000,
                },
              },
            ],
          },
        },
      })
    );
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useTraceSpans('trace-1', {
          search: search as unknown as DataPublicPluginStart['search']['search'],
        }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({
      params: {
        index: 'traces-*',
        body: {
          query: { term: { trace_id: 'trace-1' } },
          sort: [{ '@timestamp': { order: 'asc' } }],
          size: 10000,
        },
      },
    });
    expect(result.current.error).toBeNull();
    expect(result.current.spans).toHaveLength(2);
    expect(result.current.spans[0]).toMatchObject({
      span_id: 'span-1',
      trace_id: 'trace-1',
      name: 'root',
      duration_ms: 2,
    });
    expect(result.current.durationMs).toBe(501);

    queryClient.clear();
  });

  it('returns empty state and does not execute search when traceId is null', async () => {
    const search = jest.fn();
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useTraceSpans(null, {
          search: search as unknown as DataPublicPluginStart['search']['search'],
        }),
      { wrapper: Wrapper }
    );

    expect(search).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      spans: [],
      durationMs: 0,
      isLoading: false,
      error: null,
    });

    queryClient.clear();
  });
});
