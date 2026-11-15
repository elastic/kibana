/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { DATA_STREAM_INDEX_NAMES_FILTER_PATH } from '../doc_counts/utils';
import { storageStatsRoutes } from './route';

const route = storageStatsRoutes['GET /internal/streams/storage_stats'];

type HandlerParams = Parameters<typeof route.handler>[0];

interface DataStreamInput {
  name: string;
  indices: string[];
}

interface MeteringIndexInput {
  name: string;
  datastream?: string;
  size_in_bytes: number;
  num_docs: number;
}

let getDataStream: jest.Mock;
let meteringRequest: jest.Mock;

const callHandler = ({
  dataStreams,
  indicesStats = {},
  getDataStreamResponse,
  isServerless = false,
  meteringIndices = [],
}: {
  dataStreams: DataStreamInput[];
  indicesStats?: Record<string, IndicesStatsIndicesStats>;
  getDataStreamResponse?: object;
  isServerless?: boolean;
  meteringIndices?: MeteringIndexInput[];
}) => {
  getDataStream = jest.fn().mockResolvedValue(
    getDataStreamResponse ?? {
      data_streams: dataStreams.map((ds) => ({
        name: ds.name,
        indices: ds.indices.map((index_name) => ({ index_name })),
      })),
    }
  );
  const esClient = {
    indices: {
      getDataStream,
      stats: jest.fn().mockResolvedValue({ indices: indicesStats }),
    },
  };

  meteringRequest = jest.fn().mockResolvedValue({ indices: meteringIndices });
  const secondaryAuthClient = { transport: { request: meteringRequest } };

  const getScopedClients = jest.fn().mockResolvedValue({
    scopedClusterClient: { asCurrentUser: esClient, asSecondaryAuthUser: secondaryAuthClient },
    isSecurityEnabled: true,
  });

  const telemetry = {
    startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
    reportStreamsStateError: jest.fn(),
  };

  const handlerParams = {
    getScopedClients,
    request: {},
    server: { isServerless },
    params: {},
    response: {},
    logger: { error: jest.fn() },
    context: {},
    telemetry,
  } as unknown as HandlerParams;

  return route.handler(handlerParams);
};

// Frozen searchable-snapshot indices report `size_in_bytes: 0`; their real size is in
// `total_data_set_size_in_bytes`. The route reads `total` (primaries + replicas), so populate that.
const frozenStats = (totalDataSetSize: number): IndicesStatsIndicesStats =>
  ({
    total: { store: { size_in_bytes: 0, total_data_set_size_in_bytes: totalDataSetSize } },
  } as IndicesStatsIndicesStats);

const hotStats = (size: number): IndicesStatsIndicesStats =>
  ({
    total: { store: { size_in_bytes: size, total_data_set_size_in_bytes: size } },
  } as IndicesStatsIndicesStats);

describe('storage_stats route (stateful)', () => {
  it('counts frozen searchable-snapshot data via total_data_set_size_in_bytes', async () => {
    const result = await callHandler({
      dataStreams: [
        {
          name: 'my-stream',
          indices: [
            'dlm-frozen-.ds-my-stream-000001',
            'dlm-frozen-.ds-my-stream-000002',
            '.ds-my-stream-000003',
          ],
        },
      ],
      indicesStats: {
        // Frozen indices: size_in_bytes would report 0, so only total_data_set_size_in_bytes captures them.
        'dlm-frozen-.ds-my-stream-000001': frozenStats(2_000_000),
        'dlm-frozen-.ds-my-stream-000002': frozenStats(6_000_000),
        // Hot write index.
        '.ds-my-stream-000003': hotStats(18_000_000),
      },
    });

    // Sum across all phases: 2M (frozen) + 6M (frozen) + 18M (hot) = 26M.
    // If the route used size_in_bytes, frozen would contribute 0 and the total would be only 18M.
    expect(result).toEqual([{ stream: 'my-stream', store_size_bytes: 26_000_000 }]);
  });

  it('sums sizes across all backing indices per stream and groups by stream', async () => {
    const result = await callHandler({
      dataStreams: [
        { name: 'stream-a', indices: ['.ds-stream-a-000001', '.ds-stream-a-000002'] },
        { name: 'stream-b', indices: ['.ds-stream-b-000001'] },
      ],
      indicesStats: {
        '.ds-stream-a-000001': frozenStats(1_000_000),
        '.ds-stream-a-000002': hotStats(3_000_000),
        '.ds-stream-b-000001': hotStats(5_000_000),
      },
    });

    expect(result).toEqual(
      expect.arrayContaining([
        { stream: 'stream-a', store_size_bytes: 4_000_000 },
        { stream: 'stream-b', store_size_bytes: 5_000_000 },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('omits streams with zero total size', async () => {
    const result = await callHandler({
      dataStreams: [{ name: 'empty-stream', indices: ['.ds-empty-stream-000001'] }],
      indicesStats: {
        '.ds-empty-stream-000001': frozenStats(0),
      },
    });

    expect(result).toEqual([]);
  });

  it('returns an empty array when there are no data streams', async () => {
    const result = await callHandler({ dataStreams: [], indicesStats: {} });
    expect(result).toEqual([]);
  });

  it('fetches data streams with only the fields it reads', async () => {
    await callHandler({
      dataStreams: [{ name: 'stream-a', indices: ['.ds-stream-a-000001'] }],
      indicesStats: { '.ds-stream-a-000001': hotStats(1) },
    });

    expect(getDataStream).toHaveBeenCalledWith({
      filter_path: DATA_STREAM_INDEX_NAMES_FILTER_PATH,
    });
  });

  it('returns an empty array when the filtered response has no data_streams key', async () => {
    const result = await callHandler({
      dataStreams: [],
      indicesStats: {},
      getDataStreamResponse: {},
    });
    expect(result).toEqual([]);
  });

  it('reports replica-inclusive size (total, not primaries) to match the _store_stats route', async () => {
    // With number_of_replicas > 0, `total` (primaries + replicas) exceeds `primaries`. The route must
    // report `total` so the stream list matches the stream detail / lifecycle surfaces.
    const result = await callHandler({
      dataStreams: [{ name: 'replicated-stream', indices: ['.ds-replicated-stream-000001'] }],
      indicesStats: {
        '.ds-replicated-stream-000001': {
          primaries: { store: { total_data_set_size_in_bytes: 5_000_000 } },
          total: { store: { total_data_set_size_in_bytes: 10_000_000 } },
        } as IndicesStatsIndicesStats,
      },
    });

    expect(result).toEqual([{ stream: 'replicated-stream', store_size_bytes: 10_000_000 }]);
  });
});

describe('storage_stats route (serverless)', () => {
  it('sums metering sizes of backing indices per stream', async () => {
    const result = await callHandler({
      isServerless: true,
      dataStreams: [
        { name: 'stream-a', indices: ['.ds-stream-a-000001', '.ds-stream-a-000002'] },
        { name: 'stream-b', indices: ['.ds-stream-b-000001'] },
      ],
      meteringIndices: [
        { name: '.ds-stream-a-000001', datastream: 'stream-a', size_in_bytes: 1_000, num_docs: 1 },
        { name: '.ds-stream-a-000002', datastream: 'stream-a', size_in_bytes: 3_000, num_docs: 2 },
        { name: '.ds-stream-b-000001', datastream: 'stream-b', size_in_bytes: 5_000, num_docs: 3 },
      ],
    });

    expect(meteringRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_metering/stats/stream-a,stream-b',
    });
    expect(result).toEqual(
      expect.arrayContaining([
        { stream: 'stream-a', store_size_bytes: 4_000 },
        { stream: 'stream-b', store_size_bytes: 5_000 },
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('omits streams with zero metered size', async () => {
    const result = await callHandler({
      isServerless: true,
      dataStreams: [{ name: 'empty-stream', indices: ['.ds-empty-stream-000001'] }],
      meteringIndices: [
        {
          name: '.ds-empty-stream-000001',
          datastream: 'empty-stream',
          size_in_bytes: 0,
          num_docs: 0,
        },
      ],
    });

    expect(result).toEqual([]);
  });
});
