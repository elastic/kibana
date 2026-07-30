/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { ExecutionHistoryApi } from '../services/execution_history_api';
import { executionHistoryKeys } from './query_key_factory';
import { useFetchExecutionHistory } from './use_fetch_execution_history';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFetchExecutionHistory', () => {
  const mockListActionPolicyExecutions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockImplementation((service: unknown) => {
      if (service === ExecutionHistoryApi) {
        return { listActionPolicyExecutions: mockListActionPolicyExecutions } as any;
      }
      return undefined as any;
    });
  });

  it('calls listActionPolicyExecutions with the provided params (page, perPage, search, outcome)', async () => {
    mockListActionPolicyExecutions.mockResolvedValue({
      items: [],
      page: 2,
      perPage: 25,
      totalEvents: 0,
      searchMatches: null,
    });

    renderHook(
      () =>
        useFetchExecutionHistory({ page: 2, perPage: 25, search: 'foo', outcome: ['throttled'] }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(mockListActionPolicyExecutions).toHaveBeenCalledWith({
        page: 2,
        perPage: 25,
        search: 'foo',
        outcome: ['throttled'],
      });
    });
  });

  it('returns data from the API on success', async () => {
    const fakeResponse = {
      items: [{ dispatched_at: '2026-05-05T10:00:00Z' }],
      page: 1,
      perPage: 50,
      totalEvents: 1,
      searchMatches: null,
    };
    mockListActionPolicyExecutions.mockResolvedValue(fakeResponse);

    const { result } = renderHook(() => useFetchExecutionHistory({ page: 1, perPage: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fakeResponse);
  });

  it('exposes isError and the error when the API rejects', async () => {
    const error = new Error('boom');
    mockListActionPolicyExecutions.mockRejectedValue(error);

    const { result } = renderHook(() => useFetchExecutionHistory({ page: 1, perPage: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });

  it('uses a query key derived from page and perPage', async () => {
    mockListActionPolicyExecutions.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 50,
      totalEvents: 0,
      searchMatches: null,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    renderHook(() => useFetchExecutionHistory({ page: 3, perPage: 25 }), { wrapper });

    await waitFor(() => expect(mockListActionPolicyExecutions).toHaveBeenCalled());
    expect(queryClient.getQueryData(executionHistoryKeys.list({ page: 3, perPage: 25 }))).toEqual({
      items: [],
      page: 1,
      perPage: 50,
      totalEvents: 0,
      searchMatches: null,
    });
  });

  it('refetches when page or perPage change', async () => {
    mockListActionPolicyExecutions.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 50,
      totalEvents: 0,
      searchMatches: null,
    });

    const { rerender } = renderHook(
      ({ page, perPage }) => useFetchExecutionHistory({ page, perPage }),
      { wrapper: createWrapper(), initialProps: { page: 1, perPage: 50 } }
    );
    await waitFor(() => expect(mockListActionPolicyExecutions).toHaveBeenCalledTimes(1));

    rerender({ page: 2, perPage: 50 });
    await waitFor(() => expect(mockListActionPolicyExecutions).toHaveBeenCalledTimes(2));
    expect(mockListActionPolicyExecutions).toHaveBeenLastCalledWith({ page: 2, perPage: 50 });
  });
});
