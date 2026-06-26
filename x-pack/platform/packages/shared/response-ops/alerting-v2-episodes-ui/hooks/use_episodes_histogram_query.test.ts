/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useEpisodesHistogramQuery } from './use_episodes_histogram_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { useSpaceId } from './use_space_id';
import { HISTOGRAM_EPISODE_LIMIT } from '../constants';

jest.mock('../utils/execute_esql_query');
jest.mock('./use_space_id');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);
const mockUseSpaceId = jest.mocked(useSpaceId);
mockUseSpaceId.mockReturnValue('default');

const mockServices = {
  expressions: {} as ExpressionsStart,
  spaces: {} as SpacesPluginStart,
};

const mockTimeRange = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-01T02:00:00.000Z',
};

const wrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

afterEach(() => {
  jest.clearAllMocks();
  mockUseSpaceId.mockReturnValue('default'); // restore after clearAllMocks
});

describe('useEpisodesHistogramQuery', () => {
  it('returns a Datatable when the query succeeds', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([
      {
        first_timestamp: '2024-01-01T00:00:00.000Z',
        last_timestamp: '2024-01-01T00:30:00.000Z',
        'episode.status': 'inactive',
      },
    ]);

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.table).toBeDefined();
    expect(result.current.table?.type).toBe('datatable');
    expect(result.current.isCapHit).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('sets isCapHit when result has exactly HISTOGRAM_EPISODE_LIMIT rows', async () => {
    mockExecuteEsqlQuery.mockResolvedValue(
      Array.from({ length: HISTOGRAM_EPISODE_LIMIT }, () => ({
        first_timestamp: '2024-01-01T00:00:00.000Z',
        last_timestamp: '2024-01-01T01:00:00.000Z',
        'episode.status': 'inactive',
      }))
    );

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCapHit).toBe(true);
  });

  it('returns error when query fails', async () => {
    const mockError = new Error('ES|QL failed');
    mockExecuteEsqlQuery.mockRejectedValue(mockError);

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
    expect(result.current.table).toBeUndefined();
  });

  it('passes breakdownField to the query builder', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([]);

    renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
          breakdownField: 'rule.id',
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalled());
    const queryArg = mockExecuteEsqlQuery.mock.calls[0][0].query;
    expect(queryArg).toMatch(/rule\.id/);
  });

  it('fills future breakdown buckets with zero-count rows for known categories', async () => {
    // Time range covers two 1-hour buckets; only the first has an episode.
    // The second (future-like) bucket must still appear in the datatable for each known
    // breakdown category so the chart x-axis covers the full selected time range.
    mockExecuteEsqlQuery.mockResolvedValue([
      {
        first_timestamp: '2024-01-01T00:00:00.000Z',
        last_timestamp: '2024-01-01T00:30:00.000Z',
        'episode.status': 'inactive',
        effective_status: 'inactive',
      },
    ]);

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange, // covers 00:00–02:00 → two 1h buckets
          bucketInterval: '1h',
          breakdownField: 'effective_status',
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const rows = result.current.table?.rows ?? [];
    // Both buckets must be present for the known category 'inactive'
    const inactiveRows = rows.filter((r) => r.effective_status === 'inactive');
    expect(inactiveRows.length).toBe(2);
    // The second bucket must be zero-count
    const secondBucket = inactiveRows.find(
      (r) =>
        new Date(r.time_bucket as string).getTime() ===
        new Date('2024-01-01T01:00:00.000Z').getTime()
    );
    expect(secondBucket?.count).toBe(0);
  });

  it('includes timeRange in the executeEsqlQuery input', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([]);

    renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalled());
    const inputArg = mockExecuteEsqlQuery.mock.calls[0][0].input as {
      timeRange?: typeof mockTimeRange;
    };
    expect(inputArg.timeRange).toEqual(mockTimeRange);
  });
});
