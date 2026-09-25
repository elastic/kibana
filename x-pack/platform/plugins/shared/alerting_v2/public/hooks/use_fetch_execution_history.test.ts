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
import type { PolicyExecutionHistoryItem } from '@kbn/alerting-v2-schemas';
import { ExecutionHistoryApi } from '../services/execution_history_api';
import { executionHistoryKeys } from './query_key_factory';
import {
  toListExecutionHistoryRequest,
  useFetchExecutionHistory,
} from './use_fetch_execution_history';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const item: PolicyExecutionHistoryItem = {
  dispatched_at: '2026-05-05T10:00:00.000Z',
  policy: { id: 'policy-1', name: 'My Policy' },
  rules: [{ id: 'rule-1', name: 'My Rule' }],
  total_rule_count: 1,
  outcome: 'success',
  episode_count: 1,
  action_group_count: 1,
  workflows: [],
  error: null,
};

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
  const mockListActionPolicyExecutions: jest.MockedFunction<
    ExecutionHistoryApi['listActionPolicyExecutions']
  > = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockImplementation((service: unknown) => {
      if (service === ExecutionHistoryApi) {
        return { listActionPolicyExecutions: mockListActionPolicyExecutions } as any;
      }
      return undefined as any;
    });
  });

  it('calls listActionPolicyExecutions with the provided params (page, perPage, search, outcomes)', async () => {
    mockListActionPolicyExecutions.mockResolvedValue({
      items: [],
      page: 2,
      per_page: 25,
      total: 0,
      search_matches: null,
    });

    renderHook(
      () =>
        useFetchExecutionHistory({ page: 2, perPage: 25, search: 'foo', outcomes: ['throttled'] }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(mockListActionPolicyExecutions).toHaveBeenCalledWith({
        page: 2,
        per_page: 25,
        search: 'foo',
        outcomes: ['throttled'],
      });
    });
  });

  it('returns data from the API on success', async () => {
    const fakeResponse = {
      items: [item],
      page: 1,
      per_page: 50,
      total: 1,
      search_matches: null,
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
      per_page: 50,
      total: 0,
      search_matches: null,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    renderHook(() => useFetchExecutionHistory({ page: 3, perPage: 25 }), { wrapper });

    await waitFor(() => expect(mockListActionPolicyExecutions).toHaveBeenCalled());
    expect(queryClient.getQueryData(executionHistoryKeys.list({ page: 3, perPage: 25 }))).toEqual({
      items: [],
      page: 1,
      per_page: 50,
      total: 0,
      search_matches: null,
    });
  });

  it('refetches when page or perPage change', async () => {
    mockListActionPolicyExecutions.mockResolvedValue({
      items: [],
      page: 1,
      per_page: 50,
      total: 0,
      search_matches: null,
    });

    const { rerender } = renderHook(
      ({ page, perPage }) => useFetchExecutionHistory({ page, perPage }),
      { wrapper: createWrapper(), initialProps: { page: 1, perPage: 50 } }
    );
    await waitFor(() => expect(mockListActionPolicyExecutions).toHaveBeenCalledTimes(1));

    rerender({ page: 2, perPage: 50 });
    await waitFor(() => expect(mockListActionPolicyExecutions).toHaveBeenCalledTimes(2));
    expect(mockListActionPolicyExecutions).toHaveBeenLastCalledWith({ page: 2, per_page: 50 });
  });
});

describe('toListExecutionHistoryRequest', () => {
  it('maps camelCase view state to the snake_case request', () => {
    expect(
      toListExecutionHistoryRequest({
        page: 1,
        perPage: 100,
        search: 'foo',
        ruleIds: ['rule-1', 'rule-2'],
        outcomes: ['success'],
        episodeIds: ['ep-1'],
        sortField: 'dispatchedAt',
        sortOrder: 'asc',
      })
    ).toEqual({
      page: 1,
      per_page: 100,
      search: 'foo',
      rule_ids: ['rule-1', 'rule-2'],
      outcomes: ['success'],
      episode_ids: ['ep-1'],
      sort_field: 'dispatched_at',
      sort_order: 'asc',
    });
  });
});
