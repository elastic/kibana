/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Filter } from '@kbn/es-query';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import { useEpisodesHistogramQuery } from './use_episodes_histogram_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { createTestEpisodeSource } from '../types/episode_data_source.mock';
import type { EpisodeSourceHistogram } from '../types/episode_data_source';
import { HISTOGRAM_EPISODE_LIMIT, HISTOGRAM_OTHER_BREAKDOWN } from '../constants';
import { EpisodeDataSourceProvider } from '../context/episode_data_source_context';
import { useSpaceId } from './use_space_id';
import type { HistogramBucketCount, HistogramEpisodeRow } from '../utils/histogram_utils';

jest.mock('../utils/execute_esql_query');
jest.mock('./use_space_id');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);
const mockUseSpaceId = jest.mocked(useSpaceId);
mockUseSpaceId.mockReturnValue('default');

const sourceWithHistogram = (fetchHistogram: () => Promise<EpisodeSourceHistogram>) =>
  createTestEpisodeSource({ fetchHistogram });

const mockServices = {
  expressions: {} as ExpressionsStart,
  spaces: {} as SpacesPluginStart,
  http: {} as HttpStart,
};

const mockTimeRange = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-01T02:00:00.000Z',
};

const HOUR_0 = new Date('2024-01-01T00:00:00.000Z').getTime();
const HOUR_1 = new Date('2024-01-01T01:00:00.000Z').getTime();

const createWrapper = (
  dataSource?: ReturnType<typeof createTestEpisodeSource>,
  queryV2Source = true
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => {
    const qcProvider = React.createElement(QueryClientProvider, { client: queryClient }, children);
    return dataSource || !queryV2Source
      ? React.createElement(EpisodeDataSourceProvider, { dataSource, queryV2Source }, qcProvider)
      : qcProvider;
  };
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
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.table).toBeDefined();
    expect(result.current.table?.type).toBe('datatable');
    expect(result.current.isCapHit).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.sourceErrors).toEqual([]);
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
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCapHit).toBe(true);
  });

  it('returns sourceErrors and still builds a table when the v2 query fails', async () => {
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
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeUndefined();
    expect(result.current.table).toBeDefined();
    expect(result.current.sourceErrors).toEqual([{ sourceId: 'v2', error: mockError }]);
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
      { wrapper: createWrapper() }
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
      },
    ]);

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange, // covers 00:00–02:00 → two 1h buckets
          bucketInterval: '1h',
          breakdownField: 'episode.status',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const rows = result.current.table?.rows ?? [];
    // Both buckets must be present for the known category 'inactive'
    const inactiveRows = rows.filter((r) => r['episode.status'] === 'inactive');
    expect(inactiveRows.length).toBe(2);
    // The second bucket must be zero-count
    const secondBucket = inactiveRows.find(
      (r) =>
        new Date(r.time_bucket as string).getTime() ===
        new Date('2024-01-01T01:00:00.000Z').getTime()
    );
    expect(secondBucket?.count).toBe(0);
  });

  it('sends the time range as an alert-events-only request filter', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([]);

    renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalled());
    const inputArg = mockExecuteEsqlQuery.mock.calls[0][0].input as {
      timeRange?: unknown;
      filters?: Filter[];
    };
    // The range is sent as a request filter on the alert events only, so the
    // action documents are kept whatever their timestamp.
    expect(inputArg.timeRange).toBeUndefined();
    expect(inputArg.filters).toHaveLength(1);
    const should = inputArg.filters?.[0].query?.bool.should;
    expect(should[0].bool.filter[1].range['@timestamp']).toEqual(
      expect.objectContaining({ gte: mockTimeRange.from, lte: mockTimeRange.to })
    );
    expect(should[1]).toEqual({ exists: { field: 'action_type' } });
  });

  it('sums source histogram counts with v2 counts per bucket', async () => {
    const v2Row: HistogramEpisodeRow = {
      first_timestamp: '2024-01-01T00:00:00.000Z',
      last_timestamp: '2024-01-01T00:30:00.000Z',
      'episode.status': 'inactive',
    };
    const sourceCounts: HistogramBucketCount[] = [
      { bucketStart: HOUR_0, count: 2 },
      { bucketStart: HOUR_1, count: 3 },
    ];
    mockExecuteEsqlQuery.mockResolvedValue([v2Row]);
    const fetchHistogram = jest.fn().mockResolvedValue({ counts: sourceCounts, isCapHit: false });

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      { wrapper: createWrapper(sourceWithHistogram(fetchHistogram)) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchHistogram).toHaveBeenCalledWith(
      expect.objectContaining({
        buckets: [
          { start: HOUR_0, end: HOUR_1 },
          { start: HOUR_1, end: HOUR_1 + 3_600_000 },
        ],
        nowMs: expect.any(Number),
      })
    );
    expect(result.current.table?.rows).toEqual([
      { time_bucket: '2024-01-01T00:00:00.000Z', count: 3 },
      { time_bucket: '2024-01-01T01:00:00.000Z', count: 3 },
    ]);
  });

  it('ranks breakdown values across v2 and the source, folding the rest into Other', async () => {
    const v2Row: HistogramEpisodeRow = {
      first_timestamp: '2024-01-01T00:00:00.000Z',
      last_timestamp: '2024-01-01T00:30:00.000Z',
      'episode.status': 'inactive',
      'rule.id': 'v2-rule',
    };
    mockExecuteEsqlQuery.mockResolvedValue([v2Row, v2Row, v2Row]);
    const sourceRuleIds = Array.from({ length: 9 }, (_, i) => `v1-rule-${i}`);
    const fetchHistogram = jest.fn().mockResolvedValue({
      counts: [
        ...sourceRuleIds.map((breakdown) => ({ bucketStart: HOUR_0, count: 1, breakdown })),
        { bucketStart: HOUR_0, count: 5, breakdown: HISTOGRAM_OTHER_BREAKDOWN },
      ],
      isCapHit: false,
      breakdownTotals: Object.fromEntries(sourceRuleIds.map((ruleId) => [ruleId, 2])),
    });

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
          breakdownField: 'rule.id',
        }),
      { wrapper: createWrapper(sourceWithHistogram(fetchHistogram)) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const firstBucketRows = (result.current.table?.rows ?? []).filter(
      (row) => row.time_bucket === '2024-01-01T00:00:00.000Z'
    );
    // v2-rule (3 episodes) plus the first 8 tied source rules are kept; v1-rule-8 joins Other.
    expect(firstBucketRows.map((row) => [row['rule.id'], row.count])).toEqual([
      ['v2-rule', 3],
      ...sourceRuleIds.slice(0, 8).map((ruleId) => [ruleId, 1]),
      [HISTOGRAM_OTHER_BREAKDOWN, 6],
    ]);
  });

  it('clamps the bucket interval before generating buckets for sources', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([]);
    const fetchHistogram = jest.fn().mockResolvedValue({ counts: [], isCapHit: false });

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-31T00:00:00.000Z' },
          bucketInterval: '1m',
        }),
      { wrapper: createWrapper(sourceWithHistogram(fetchHistogram)) }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const [{ buckets }] = fetchHistogram.mock.calls[0];
    expect(buckets.length).toBeLessThanOrEqual(1000);
  });

  it('does not set isCapHit when neither v2 nor the source hit their cap', async () => {
    const v2Rows = Array.from({ length: HISTOGRAM_EPISODE_LIMIT - 1 }, () => ({
      first_timestamp: '2024-01-01T00:00:00.000Z',
      last_timestamp: '2024-01-01T01:00:00.000Z',
      'episode.status': 'inactive' as const,
    }));
    mockExecuteEsqlQuery.mockResolvedValue(v2Rows);

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      {
        wrapper: createWrapper(
          sourceWithHistogram(
            jest.fn().mockResolvedValue({
              counts: [{ bucketStart: HOUR_0, count: 50_000 }],
              isCapHit: false,
            })
          )
        ),
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isCapHit).toBe(false);
  });

  it('sets isCapHit when a source reports hitting its own cap', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([]);

    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      {
        wrapper: createWrapper(
          sourceWithHistogram(jest.fn().mockResolvedValue({ counts: [], isCapHit: true }))
        ),
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isCapHit).toBe(true);
  });

  it('skips the v2 query and builds the table from source counts when queryV2Source is false', async () => {
    const { result } = renderHook(
      () =>
        useEpisodesHistogramQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
          bucketInterval: '1h',
        }),
      {
        wrapper: createWrapper(
          sourceWithHistogram(
            jest.fn().mockResolvedValue({
              counts: [{ bucketStart: HOUR_1, count: 1 }],
              isCapHit: false,
            })
          ),
          false
        ),
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current.sourceErrors).toEqual([]);
    expect(result.current.table?.rows.some((row) => row.count > 0)).toBe(true);
  });

  it('returns v2-only rows when a source fetch fails', async () => {
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
      {
        wrapper: createWrapper(
          sourceWithHistogram(jest.fn().mockRejectedValue(new Error('source fetch failed')))
        ),
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.table).toBeDefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.sourceErrors).toEqual([
      { sourceId: 'test-source', error: new Error('source fetch failed') },
    ]);
  });
});
