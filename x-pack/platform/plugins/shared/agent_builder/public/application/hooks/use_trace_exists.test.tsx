/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of } from 'rxjs';
import { useTraceExists } from './use_trace_exists';

const mockSearch = jest.fn();
let mockSpaceId: string | undefined = 'test-space';

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      plugins: {
        data: { search: { search: mockSearch } },
        spaces: {},
      },
    },
  }),
}));

jest.mock('./use_space_id', () => ({
  useSpaceId: () => mockSpaceId,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, Wrapper };
};

const searchResponse = (totalHits: number) =>
  of({ rawResponse: { hits: { total: { value: totalHits } } } });

describe('useTraceExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpaceId = 'test-space';
  });

  it('returns exists=true when traces are found', async () => {
    mockSearch.mockReturnValue(searchResponse(1));
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceExists('trace-123'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.exists).toBe(true);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          index: 'traces-agent_builder.otel-test-space',
          body: expect.objectContaining({
            query: { term: { trace_id: 'trace-123' } },
          }),
        }),
      })
    );

    queryClient.clear();
  });

  it('returns exists=false when no traces are found', async () => {
    mockSearch.mockReturnValue(searchResponse(0));
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceExists('trace-456'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.exists).toBe(false);
    queryClient.clear();
  });

  it('does not fetch when traceId is null', () => {
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceExists(null), { wrapper: Wrapper });

    expect(mockSearch).not.toHaveBeenCalled();
    expect(result.current).toEqual({ exists: false, isLoading: false });
    queryClient.clear();
  });

  it('does not fetch when enabled is false', () => {
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceExists('trace-1', { enabled: false }), {
      wrapper: Wrapper,
    });

    expect(mockSearch).not.toHaveBeenCalled();
    expect(result.current.exists).toBe(false);
    queryClient.clear();
  });

  it('does not fetch when spaceId is undefined', () => {
    mockSpaceId = undefined;
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceExists('trace-1'), { wrapper: Wrapper });

    expect(mockSearch).not.toHaveBeenCalled();
    expect(result.current.exists).toBe(false);
    queryClient.clear();
  });

  it('uses space-scoped index pattern', async () => {
    mockSpaceId = 'marketing';
    mockSearch.mockReturnValue(searchResponse(0));
    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useTraceExists('trace-1'), { wrapper: Wrapper });

    await waitFor(() => expect(mockSearch).toHaveBeenCalled());

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          index: 'traces-agent_builder.otel-marketing',
        }),
      })
    );

    queryClient.clear();
  });

  it('stops polling after traces are found', async () => {
    jest.useFakeTimers();
    mockSearch.mockReturnValueOnce(searchResponse(0)).mockReturnValue(searchResponse(1));
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useTraceExists('trace-1'), { wrapper: Wrapper });

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    expect(result.current.exists).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    await waitFor(() => expect(result.current.exists).toBe(true));
    const callCountAfterFound = mockSearch.mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(mockSearch).toHaveBeenCalledTimes(callCountAfterFound);

    jest.useRealTimers();
    queryClient.clear();
  });
});
