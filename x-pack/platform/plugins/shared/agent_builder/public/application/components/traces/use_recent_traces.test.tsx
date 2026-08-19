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
import { of } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useRecentTraces } from './use_recent_traces';

// The real `search` type is `Observable<IKibanaSearchResponse<any>>`; our test doubles
// resolve with a narrower shape, so cast through `unknown` to keep the hook's public
// type check happy without leaking `any` into the test bodies.
type SearchFn = DataPublicPluginStart['search']['search'];
const asSearch = (fn: unknown): SearchFn => fn as SearchFn;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
};

describe('useRecentTraces', () => {
  it('does not fetch when the index is not resolved yet', () => {
    const search = jest.fn();
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useRecentTraces({ search: asSearch(search), index: undefined }),
      {
        wrapper: Wrapper,
      }
    );

    expect(search).not.toHaveBeenCalled();
    expect(result.current.traces).toEqual([]);
  });

  it('maps a collapsed inner-hits response into RecentTrace rows', async () => {
    const search = jest.fn(() =>
      of({
        rawResponse: {
          hits: {
            hits: [
              {
                _source: {
                  trace_id: 'trace-1',
                  '@timestamp': '2026-08-13T00:00:10Z',
                  name: 'chat gpt-5',
                  duration: 200_000_000,
                },
                inner_hits: {
                  root: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            name: 'invoke_agent elastic-ai-agent',
                            '@timestamp': '2026-08-13T00:00:00Z',
                            duration: 1_500_000_000,
                          },
                        },
                      ],
                    },
                  },
                },
              },
              {
                _source: {
                  trace_id: 'trace-2',
                  '@timestamp': '2026-08-12T00:00:00Z',
                  name: 'execute_tool load_skill',
                  duration: 800_000_000,
                },
              },
            ],
          },
        },
      })
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useRecentTraces({
          search: asSearch(search),
          index: 'traces-agent_builder.otel-default',
        }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          index: 'traces-agent_builder.otel-default',
          body: expect.objectContaining({
            size: 10,
            sort: [{ '@timestamp': { order: 'desc' } }],
            collapse: expect.objectContaining({ field: 'trace_id' }),
          }),
        }),
      })
    );

    // First row prefers the earliest-inner-hit (i.e. the root span) for name/timestamp/duration.
    expect(result.current.traces).toEqual([
      {
        traceId: 'trace-1',
        timestamp: '2026-08-13T00:00:00Z',
        rootSpanName: 'invoke_agent elastic-ai-agent',
        durationMs: 1500,
      },
      // Second row falls back to the outer hit when inner_hits is absent.
      {
        traceId: 'trace-2',
        timestamp: '2026-08-12T00:00:00Z',
        rootSpanName: 'execute_tool load_skill',
        durationMs: 800,
      },
    ]);
  });
});
