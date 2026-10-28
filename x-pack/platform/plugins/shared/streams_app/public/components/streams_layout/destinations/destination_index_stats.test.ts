/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import {
  buildDestinationIndexRows,
  getReadableFailureStoreNames,
  loadDestinationIndexStats,
  sortDestinationIndexRows,
  type DestinationIndexStats,
} from './destination_index_stats';

const dataStream = (
  name: string,
  overrides: Partial<Extract<ResolvedDestinationIndex, { is_data_stream: true }>> = {}
): ResolvedDestinationIndex => ({
  name,
  is_data_stream: true,
  lifecycle: { dsl: { data_retention: '7d' } },
  failure_store_enabled: false,
  failure_store_has_data: false,
  privileges: { read_failure_store: true },
  ...overrides,
});

const stats: DestinationIndexStats = {
  timeRange: { start: 0, end: 10_000 },
  docs: { 'logs-a-default': 100, 'logs-b-default': 50 },
  degradedDocs: { 'logs-b-default': 40 },
  failedDocs: undefined,
  ingestedDocs: { 'logs-a-default': 20 },
  storageBytes: { 'logs-a-default': 2048 },
};

describe('destination index stats', () => {
  it('joins bulk stats onto rows, treating indices missing from a response as zero', () => {
    const [first, second, regular] = buildDestinationIndexRows(
      [
        dataStream('logs-a-default', { health: 'green' }),
        dataStream('logs-b-default', { lifecycle: { ilm: { policy: 'logs' } } }),
        { name: 'legacy-index', is_data_stream: false },
      ],
      stats
    );

    expect(first).toMatchObject({
      documents: 100,
      throughput: 2,
      storageBytes: 2048,
      quality: 'good',
      health: 'green',
      failureStoreEnabled: false,
    });
    expect(second).toMatchObject({
      documents: 50,
      throughput: 0,
      storageBytes: 0,
      quality: 'poor',
      retentionMs: Number.POSITIVE_INFINITY,
    });
    expect(regular).toEqual({ name: 'legacy-index', isDataStream: false, retentionMs: 0 });
  });

  it('leaves quality unknown when failed docs could not be loaded for an enabled failure store', () => {
    const [row] = buildDestinationIndexRows(
      [dataStream('logs-a-default', { failure_store_enabled: true })],
      stats
    );
    expect(row.quality).toBeUndefined();
  });

  it('leaves stats unknown before they load', () => {
    const [row] = buildDestinationIndexRows([dataStream('logs-a-default')], undefined);
    expect(row).toMatchObject({
      documents: undefined,
      throughput: undefined,
      storageBytes: undefined,
      quality: undefined,
    });
  });

  it('sorts by value in both directions with unknown values last and name as tie-breaker', () => {
    const rows = buildDestinationIndexRows(
      [
        dataStream('logs-c-default'),
        dataStream('logs-a-default'),
        dataStream('logs-b-default'),
        { name: 'legacy-index', is_data_stream: false },
      ],
      stats
    );

    const names = (direction: 'asc' | 'desc') =>
      sortDestinationIndexRows(rows, { field: 'documents', direction }).map(({ name }) => name);

    expect(names('asc')).toEqual([
      'logs-c-default',
      'logs-b-default',
      'logs-a-default',
      'legacy-index',
    ]);
    expect(names('desc')).toEqual([
      'logs-a-default',
      'logs-b-default',
      'logs-c-default',
      'legacy-index',
    ]);
  });

  it('ranks unhealthy indices first when sorting by health ascending', () => {
    const rows = buildDestinationIndexRows(
      [
        dataStream('logs-a-default', { health: 'green' }),
        dataStream('logs-b-default', { health: 'red' }),
        dataStream('logs-c-default', { health: 'yellow' }),
        dataStream('logs-d-default'),
      ],
      undefined
    );

    expect(
      sortDestinationIndexRows(rows, { field: 'health', direction: 'asc' }).map(({ name }) => name)
    ).toEqual(['logs-b-default', 'logs-c-default', 'logs-a-default', 'logs-d-default']);
  });

  it('only counts failed docs of enabled failure stores the user can read', () => {
    expect(
      getReadableFailureStoreNames([
        dataStream('logs-off-default'),
        dataStream('logs-denied-default', {
          failure_store_enabled: true,
          failure_store_has_data: true,
          privileges: { read_failure_store: false },
        }),
        dataStream('logs-empty-default', { failure_store_enabled: true }),
        dataStream('logs-readable-default', {
          failure_store_enabled: true,
          failure_store_has_data: true,
        }),
        { name: 'legacy-index', is_data_stream: false },
      ])
    ).toEqual(['logs-readable-default']);
  });

  it('only requests the given data streams, in batches, and skips failed counts without a readable failure store', async () => {
    const fetch = jest.fn(
      async (endpoint: string, { params }: { params: { body: { streams: string[] } } }) => {
        if (endpoint === 'POST /internal/streams/doc_counts/degraded') {
          throw new Error('boom');
        }
        const names = params.body.streams;
        return endpoint === 'POST /internal/streams/storage_stats'
          ? names.map((stream) => ({ stream, store_size_bytes: 10 }))
          : names.map((stream) => ({ stream, count: 1 }));
      }
    );
    const dataStreamNames = Array.from({ length: 2500 }, (_, index) => `logs-app${index}-default`);

    const result = await loadDestinationIndexStats({
      streamsRepositoryClient: { fetch } as unknown as Parameters<
        typeof loadDestinationIndexStats
      >[0]['streamsRepositoryClient'],
      dataStreamNames,
      failureStoreNames: [],
      timeRange: { start: 0, end: 1000 },
      signal: new AbortController().signal,
    });

    // 3 batches of at most 1000 names, 4 endpoints each (failed counts are not readable),
    // minus the degraded requests skipped after the first batch failed.
    expect(fetch).toHaveBeenCalledTimes(10);
    const requestedNames = fetch.mock.calls
      .filter(([endpoint]) => endpoint === 'POST /internal/streams/doc_counts/total')
      .map(([, { params }]) => params.body.streams.length);
    expect(requestedNames).toEqual([1000, 1000, 500]);
    expect(
      fetch.mock.calls.some(([endpoint]) => endpoint === 'POST /internal/streams/doc_counts/failed')
    ).toBe(false);
    expect(Object.keys(result.docs ?? {})).toHaveLength(2500);
    expect(result.storageBytes?.['logs-app0-default']).toBe(10);
    expect(result.degradedDocs).toBeUndefined();
    expect(result.failedDocs).toEqual({});
  });

  it('only requests failed doc counts for readable failure stores', async () => {
    const fetch = jest.fn(
      async (endpoint: string, { params }: { params: { body: { streams: string[] } } }) =>
        endpoint === 'POST /internal/streams/storage_stats'
          ? []
          : params.body.streams.map((stream) => ({ stream, count: 2 }))
    );

    const result = await loadDestinationIndexStats({
      streamsRepositoryClient: { fetch } as unknown as Parameters<
        typeof loadDestinationIndexStats
      >[0]['streamsRepositoryClient'],
      dataStreamNames: ['logs-a-default', 'logs-b-default'],
      failureStoreNames: ['logs-b-default'],
      timeRange: { start: 0, end: 1000 },
      signal: new AbortController().signal,
    });

    const failedRequest = fetch.mock.calls.find(
      ([endpoint]) => endpoint === 'POST /internal/streams/doc_counts/failed'
    );
    expect(failedRequest?.[1].params.body.streams).toEqual(['logs-b-default']);
    expect(result.failedDocs).toEqual({ 'logs-b-default': 2 });
    expect(result.docs).toEqual({ 'logs-a-default': 2, 'logs-b-default': 2 });
  });

  it('makes no requests for a destination without data streams', async () => {
    const fetch = jest.fn();

    await loadDestinationIndexStats({
      streamsRepositoryClient: { fetch } as unknown as Parameters<
        typeof loadDestinationIndexStats
      >[0]['streamsRepositoryClient'],
      dataStreamNames: [],
      failureStoreNames: [],
      timeRange: { start: 0, end: 1000 },
      signal: new AbortController().signal,
    });

    expect(fetch).not.toHaveBeenCalled();
  });
});
