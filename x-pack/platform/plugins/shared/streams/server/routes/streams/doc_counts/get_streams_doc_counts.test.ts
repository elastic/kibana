/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { StreamsClient } from '../../../lib/streams/client';
import {
  getDegradedDocCountsForStreams,
  getDocCountsForStreams,
  getFailedDocCountsForStreams,
  getIngestionDocCountsForStreams,
} from './get_streams_doc_counts';
import { DATA_STREAM_INDEX_NAMES_FILTER_PATH } from './utils';

const dataStreams = [
  {
    name: 'logs-a',
    indices: [{ index_name: '.ds-logs-a-000001' }, { index_name: '.ds-logs-a-000002' }],
    failure_store: { indices: [{ index_name: '.fs-logs-a-000001' }] },
  },
];

const makeEsClient = () => {
  const getDataStream = jest.fn().mockResolvedValue({ data_streams: dataStreams });
  const resolveIndex = jest.fn(async ({ name }: { name: string }) => ({
    data_streams: name.split(',').map((dataStreamName) => ({ name: dataStreamName })),
  }));
  const esClient = {
    indices: {
      getDataStream,
      resolveIndex,
      stats: jest.fn().mockResolvedValue({
        indices: {
          '.ds-logs-a-000001': { primaries: { docs: { count: 3 } } },
          '.ds-logs-a-000002': { primaries: { docs: { count: 4 } } },
        },
      }),
    },
    search: jest.fn().mockResolvedValue({
      aggregations: { per_index: { buckets: { '.ds-logs-a-000002': { doc_count: 2 } } } },
    }),
    esql: {
      query: jest.fn().mockResolvedValue({
        columns: [{ name: 'failed_count' }, { name: 'backing_index' }],
        values: [[5, '.fs-logs-a-000001']],
      }),
    },
  } as unknown as ElasticsearchClient;
  return { esClient, getDataStream, resolveIndex };
};

const streamsClient = {
  getPrivilegesPerStream: jest.fn(async (names: string[]) =>
    Object.fromEntries(names.map((name) => [name, { read_failure_store: true }]))
  ),
} as unknown as StreamsClient;

const cases = [
  {
    name: 'getDocCountsForStreams',
    run: (esClient: ElasticsearchClient, streamName?: string) =>
      getDocCountsForStreams({ isServerless: false, esClient, streamName }),
    expected: [{ stream: 'logs-a', count: 7 }],
  },
  {
    name: 'getDegradedDocCountsForStreams',
    run: (esClient: ElasticsearchClient, streamName?: string) =>
      getDegradedDocCountsForStreams({ esClient, streamName }),
    expected: [{ stream: 'logs-a', count: 2 }],
  },
  {
    name: 'getIngestionDocCountsForStreams',
    run: (esClient: ElasticsearchClient, streamName?: string) =>
      getIngestionDocCountsForStreams({ esClient, streamsClient, start: 0, end: 1, streamName }),
    expected: [{ stream: 'logs-a', count: 2 }],
  },
  {
    name: 'getFailedDocCountsForStreams',
    run: (esClient: ElasticsearchClient, streamName?: string) =>
      getFailedDocCountsForStreams({ esClient, start: 0, end: 1, streamName }),
    expected: [{ stream: 'logs-a', count: 5 }],
  },
];

describe.each(cases)('$name', ({ run, expected }) => {
  it('fetches all data streams with only the fields it reads', async () => {
    const { esClient, getDataStream } = makeEsClient();

    await expect(run(esClient)).resolves.toEqual(expected);
    expect(getDataStream).toHaveBeenCalledTimes(1);
    expect(getDataStream).toHaveBeenCalledWith({
      filter_path: DATA_STREAM_INDEX_NAMES_FILTER_PATH,
    });
  });

  it('fetches a single named stream with only the fields it reads', async () => {
    const { esClient, getDataStream } = makeEsClient();

    await expect(run(esClient, 'logs-a')).resolves.toEqual(expected);
    expect(getDataStream).toHaveBeenCalledWith({
      name: ['logs-a', 'logs-b'],
      filter_path: DATA_STREAM_INDEX_NAMES_FILTER_PATH,
    });
  });

  it('returns no counts when the filtered response has no data_streams key', async () => {
    const { esClient, getDataStream } = makeEsClient();
    getDataStream.mockResolvedValue({});

    await expect(run(esClient)).resolves.toEqual([]);
  });
});

describe('getFailedDocCountsForStreams query scope', () => {
  const getEsqlQuery = (esClient: ElasticsearchClient): string =>
    (esClient.esql.query as jest.Mock).mock.calls[0][0].query;

  it('reads every failure store when no stream is given', async () => {
    const { esClient } = makeEsClient();

    await getFailedDocCountsForStreams({ esClient, start: 0, end: 1 });

    expect(getEsqlQuery(esClient)).toMatch(/^FROM \*::failures METADATA _index/);
  });

  it('only reads the failure indices of the requested streams', async () => {
    const { esClient } = makeEsClient();

    await getFailedDocCountsForStreams({ esClient, start: 0, end: 1, streamName: 'logs-a' });

    expect(getEsqlQuery(esClient)).toMatch(/^FROM \.fs-logs-a-000001 METADATA _index/);
  });

  it('reads the failure indices of several requested streams', async () => {
    const { esClient, getDataStream } = makeEsClient();
    getDataStream.mockResolvedValue({
      data_streams: [
        ...dataStreams,
        {
          name: 'logs-b',
          indices: [],
          failure_store: { indices: [{ index_name: '.fs-logs-b-1' }] },
        },
      ],
    });
    (esClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'failed_count' }, { name: 'backing_index' }],
      values: [
        [5, '.fs-logs-a-000001'],
        [3, '.fs-logs-b-1'],
      ],
    });

    const result = await getFailedDocCountsForStreams({
      esClient,
      start: 0,
      end: 1,
      streamNames: ['logs-a', 'logs-b'],
    });

    expect(getDataStream).toHaveBeenCalledWith({
      name: ['logs-a'],
      filter_path: DATA_STREAM_INDEX_NAMES_FILTER_PATH,
    });
    expect(getEsqlQuery(esClient)).toMatch(/^FROM \.fs-logs-a-000001,\.fs-logs-b-1 METADATA/);
    expect(result).toEqual([
      { stream: 'logs-a', count: 5 },
      { stream: 'logs-b', count: 3 },
    ]);
  });
});
