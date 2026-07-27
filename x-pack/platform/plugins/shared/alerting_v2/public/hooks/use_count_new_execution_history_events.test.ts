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
import { useCountNewExecutionHistoryEvents } from './use_count_new_execution_history_events';

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

describe('useCountNewExecutionHistoryEvents', () => {
  const mockListExecutionHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockImplementation((service: unknown) => {
      if (service === ExecutionHistoryApi) {
        return { listExecutionHistory: mockListExecutionHistory } as any;
      }
      return undefined as any;
    });
  });

  it('reads the count from the list endpoint with perPage=0 and the provided filters', async () => {
    mockListExecutionHistory.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 0,
      totalEvents: 7,
      searchMatches: null,
    });

    renderHook(
      () =>
        useCountNewExecutionHistoryEvents({
          since: '2026-01-01T00:00:00.000Z',
          search: 'foo',
          ruleIds: ['rule-1'],
          outcome: ['throttled'],
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockListExecutionHistory).toHaveBeenCalledWith({
        start_date: '2026-01-01T00:00:00.000Z',
        perPage: 0,
        search: 'foo',
        ruleIds: ['rule-1'],
        outcome: ['throttled'],
      });
    });
  });

  it('exposes the list response (with totalEvents) as data', async () => {
    const fakeResponse = {
      items: [],
      page: 1,
      perPage: 0,
      totalEvents: 42,
      searchMatches: null,
    };
    mockListExecutionHistory.mockResolvedValue(fakeResponse);

    const { result } = renderHook(
      () => useCountNewExecutionHistoryEvents({ since: '2026-01-01T00:00:00.000Z' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(fakeResponse);
  });

  it('does not fetch when disabled', async () => {
    renderHook(
      () =>
        useCountNewExecutionHistoryEvents({
          since: '2026-01-01T00:00:00.000Z',
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockListExecutionHistory).not.toHaveBeenCalled();
  });
});
