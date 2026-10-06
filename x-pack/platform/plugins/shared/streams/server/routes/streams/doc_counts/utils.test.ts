/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  getAllBackingIndicesByStream,
  getDataStreamsMeteringStats,
  getLastBackingIndexByStream,
} from './utils';

type DataStreams = IndicesGetDataStreamResponse['data_streams'];

const makeDataStream = (name: string, indexNames: Array<string | undefined>): DataStreams[number] =>
  ({
    name,
    indices: indexNames.map((index_name) => ({ index_name })),
  } as DataStreams[number]);

describe('getAllBackingIndicesByStream', () => {
  it('returns all backing indices for each stream, not just the write index', () => {
    const dataStreams = [
      makeDataStream('logs-foo', [
        '.ds-logs-foo-000001',
        '.ds-logs-foo-000002',
        '.ds-logs-foo-000003',
      ]),
      makeDataStream('logs-bar', ['.ds-logs-bar-000001']),
    ];

    const result = getAllBackingIndicesByStream(dataStreams);

    expect(result.get('logs-foo')).toEqual([
      '.ds-logs-foo-000001',
      '.ds-logs-foo-000002',
      '.ds-logs-foo-000003',
    ]);
    expect(result.get('logs-bar')).toEqual(['.ds-logs-bar-000001']);
  });

  it('includes rolled-over indices so totals span every phase (hot + frozen)', () => {
    // Mimics a DLM stream where older backing indices have been mounted as frozen searchable snapshots.
    const dataStreams = [
      makeDataStream('my-stream', [
        'dlm-frozen-.ds-my-stream-000001',
        'dlm-frozen-.ds-my-stream-000002',
        '.ds-my-stream-000003',
      ]),
    ];

    const result = getAllBackingIndicesByStream(dataStreams);

    expect(result.get('my-stream')).toEqual([
      'dlm-frozen-.ds-my-stream-000001',
      'dlm-frozen-.ds-my-stream-000002',
      '.ds-my-stream-000003',
    ]);
  });

  it('filters out indices with a missing index_name', () => {
    const dataStreams = [
      makeDataStream('logs-foo', ['.ds-logs-foo-000001', undefined, '.ds-logs-foo-000002']),
    ];

    const result = getAllBackingIndicesByStream(dataStreams);

    expect(result.get('logs-foo')).toEqual(['.ds-logs-foo-000001', '.ds-logs-foo-000002']);
  });

  it('omits streams that have no backing indices with a name', () => {
    const dataStreams = [
      makeDataStream('empty-stream', []),
      makeDataStream('nameless-stream', [undefined]),
      makeDataStream('logs-foo', ['.ds-logs-foo-000001']),
    ];

    const result = getAllBackingIndicesByStream(dataStreams);

    expect(result.has('empty-stream')).toBe(false);
    expect(result.has('nameless-stream')).toBe(false);
    expect(result.get('logs-foo')).toEqual(['.ds-logs-foo-000001']);
  });

  it('returns an empty map when there are no data streams', () => {
    expect(getAllBackingIndicesByStream([])).toEqual(new Map());
  });
});

describe('getLastBackingIndexByStream', () => {
  it('returns only the write (last) backing index per stream', () => {
    const dataStreams = [
      makeDataStream('logs-foo', [
        '.ds-logs-foo-000001',
        '.ds-logs-foo-000002',
        '.ds-logs-foo-000003',
      ]),
    ];

    const result = getLastBackingIndexByStream(dataStreams);

    expect(result.get('logs-foo')).toBe('.ds-logs-foo-000003');
  });

  it('omits streams with no backing indices', () => {
    const dataStreams = [makeDataStream('empty-stream', [])];

    const result = getLastBackingIndexByStream(dataStreams);

    expect(result.has('empty-stream')).toBe(false);
  });
});

interface MeteringIndex {
  name: string;
  num_docs: number;
  size_in_bytes: number;
}

// Answers each `/_metering/stats/<names>` call with whatever `respond` returns for that chunk.
const makeMeteringClient = (
  respond: (names: string[]) => { indices?: MeteringIndex[] }
): { esClient: ElasticsearchClient; request: jest.Mock } => {
  const request = jest.fn(async ({ path }: { path: string }) =>
    respond(path.replace('/_metering/stats/', '').split(','))
  );
  const esClient = { transport: { request } } as unknown as ElasticsearchClient;
  return { esClient, request };
};

const indexEntry = (name: string, seed: number): MeteringIndex => ({
  name,
  num_docs: seed,
  size_in_bytes: seed * 10,
});

const makeBackingIndexNames = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `.ds-logs-stream-${String(i).padStart(6, '0')}`);

describe('getDataStreamsMeteringStats', () => {
  it('returns an empty record without calling ES when there are no data streams', async () => {
    const { esClient, request } = makeMeteringClient(() => ({ indices: [] }));

    await expect(getDataStreamsMeteringStats({ esClient, dataStreams: [] })).resolves.toEqual({});
    expect(request).not.toHaveBeenCalled();
  });

  it('maps every returned index to sizeBytes and totalDocs for a single chunk', async () => {
    const { esClient, request } = makeMeteringClient((names) => ({
      indices: names.map((name, i) => indexEntry(name, i + 1)),
    }));

    const result = await getDataStreamsMeteringStats({
      esClient,
      dataStreams: ['.ds-logs-a-000001', '.ds-logs-b-000001'],
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_metering/stats/.ds-logs-a-000001,.ds-logs-b-000001',
    });
    expect(result).toEqual({
      '.ds-logs-a-000001': { sizeBytes: 10, totalDocs: 1 },
      '.ds-logs-b-000001': { sizeBytes: 20, totalDocs: 2 },
    });
  });

  it('merges entries from every chunk when the input exceeds one chunk', async () => {
    const { esClient, request } = makeMeteringClient((names) => ({
      indices: names.map((name) => indexEntry(name, Number(name.slice(-6)) + 1)),
    }));

    const result = await getDataStreamsMeteringStats({
      esClient,
      dataStreams: makeBackingIndexNames(400),
    });

    expect(request.mock.calls.length).toBeGreaterThan(1);
    expect(Object.keys(result)).toHaveLength(400);
    expect(result['.ds-logs-stream-000000']).toEqual({ sizeBytes: 10, totalDocs: 1 });
    expect(result['.ds-logs-stream-000399']).toEqual({ sizeBytes: 4000, totalDocs: 400 });
  });

  it('lets the last chunk win when two chunks return the same index name', async () => {
    let chunkNumber = 0;
    const { esClient } = makeMeteringClient((names) => {
      chunkNumber += 1;
      // Every chunk also reports the first index, with a value that identifies the chunk.
      return {
        indices: [
          ...names.map((name) => indexEntry(name, 1)),
          indexEntry('.ds-logs-stream-000000', chunkNumber * 1000),
        ],
      };
    });

    const result = await getDataStreamsMeteringStats({
      esClient,
      dataStreams: makeBackingIndexNames(400),
    });

    expect(chunkNumber).toBeGreaterThan(1);
    expect(result['.ds-logs-stream-000000']).toEqual({
      sizeBytes: chunkNumber * 10000,
      totalDocs: chunkNumber * 1000,
    });
  });

  it('skips chunks that come back without an indices field', async () => {
    const { esClient } = makeMeteringClient((names) =>
      names.includes('.ds-logs-stream-000000')
        ? {}
        : { indices: names.map((name) => indexEntry(name, 1)) }
    );

    const result = await getDataStreamsMeteringStats({
      esClient,
      dataStreams: makeBackingIndexNames(400),
    });

    expect(result['.ds-logs-stream-000000']).toBeUndefined();
    expect(result['.ds-logs-stream-000399']).toEqual({ sizeBytes: 10, totalDocs: 1 });
  });

  it('aggregates 10,000 entries in linear time', async () => {
    // Regression guard for elastic/sdh-kibana#6555: a quadratic accumulator needed seconds for
    // this input and blocked the Kibana event loop for the whole time.
    const { esClient } = makeMeteringClient((names) => ({
      indices: names.map((name) => indexEntry(name, 1)),
    }));

    const startedAt = performance.now();
    const result = await getDataStreamsMeteringStats({
      esClient,
      dataStreams: makeBackingIndexNames(10000),
    });
    const elapsedMs = performance.now() - startedAt;

    expect(Object.keys(result)).toHaveLength(10000);
    expect(elapsedMs).toBeLessThan(1000);
  }, 30000);
});
