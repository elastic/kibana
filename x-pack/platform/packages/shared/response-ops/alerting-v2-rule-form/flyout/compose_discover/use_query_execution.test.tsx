/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { createTestQueryClient } from '../../test_utils';
import { useQueryExecution } from './use_query_execution';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
}));

const mockGetESQLResults = getESQLResults as jest.Mock;

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const data = { search: { search: jest.fn() } } as unknown as DataPublicPluginStart;
const timeRange = { from: 'now-15m', to: 'now' };

describe('useQueryExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has not run until run() is called', () => {
    const { result } = renderHook(
      () => useQueryExecution({ query: 'FROM logs-*', timeField: '@timestamp', timeRange, data }),
      { wrapper: createWrapper() }
    );

    expect(result.current.hasRun).toBe(false);
  });

  it("keeps a tab's own error when switching away and back, without re-running or clearing it", async () => {
    mockGetESQLResults.mockImplementation(async ({ esqlQuery }: { esqlQuery: string }) => {
      if (esqlQuery.includes('garbage')) {
        throw new Error('bad query');
      }
      return { response: { columns: [], values: [] } };
    });

    const { result, rerender } = renderHook(
      ({ tab, query }: { tab: string; query: string }) =>
        useQueryExecution({ query, timeField: '@timestamp', timeRange, data, tab }),
      {
        wrapper: createWrapper(),
        initialProps: { tab: 'alert', query: 'FROM logs-* garbage' },
      }
    );

    act(() => result.current.run());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe('bad query');

    // A tab that has never been run shows no error and no stale result.
    rerender({ tab: 'base', query: 'FROM logs-*' });
    expect(result.current.hasRun).toBe(false);
    expect(result.current.isError).toBe(false);

    // Switching back re-shows the alert tab's own error — the user never has to re-run it.
    rerender({ tab: 'alert', query: 'FROM logs-* garbage' });
    expect(result.current.hasRun).toBe(true);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe('bad query');
  });

  it('runs each tab independently, never showing one tab’s result for another', async () => {
    mockGetESQLResults.mockImplementation(async ({ esqlQuery }: { esqlQuery: string }) => ({
      response: {
        columns: [{ name: 'count', type: 'long' }],
        values: esqlQuery.includes('base') ? [[1]] : [[2]],
      },
    }));

    const { result, rerender } = renderHook(
      ({ tab, query }: { tab: string; query: string }) =>
        useQueryExecution({ query, timeField: '@timestamp', timeRange, data, tab }),
      { wrapper: createWrapper(), initialProps: { tab: 'base', query: 'FROM base-index' } }
    );

    act(() => result.current.run());
    await waitFor(() => expect(result.current.rows[0]?.count).toBe('1'));

    rerender({ tab: 'alert', query: 'FROM alert-index' });
    expect(result.current.hasRun).toBe(false);

    act(() => result.current.run());
    await waitFor(() => expect(result.current.rows[0]?.count).toBe('2'));

    rerender({ tab: 'base', query: 'FROM base-index' });
    await waitFor(() => expect(result.current.rows[0]?.count).toBe('1'));
  });
});
