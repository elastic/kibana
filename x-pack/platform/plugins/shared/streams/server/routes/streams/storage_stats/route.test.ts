/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { storageStatsRoutes } from './route';

const route = storageStatsRoutes['GET /internal/streams/storage_stats'];

type HandlerParams = Parameters<typeof route.handler>[0];

interface DataStreamInput {
  name: string;
  indices: string[];
}

const callHandler = ({
  dataStreams,
  indicesStats,
}: {
  dataStreams: DataStreamInput[];
  indicesStats: Record<string, IndicesStatsIndicesStats>;
}) => {
  const esClient = {
    indices: {
      getDataStream: jest.fn().mockResolvedValue({
        data_streams: dataStreams.map((ds) => ({
          name: ds.name,
          indices: ds.indices.map((index_name) => ({ index_name })),
        })),
      }),
      stats: jest.fn().mockResolvedValue({ indices: indicesStats }),
    },
  };

  const getScopedClients = jest.fn().mockResolvedValue({
    scopedClusterClient: { asCurrentUser: esClient },
    isSecurityEnabled: true,
  });

  const telemetry = {
    startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
    reportStreamsStateError: jest.fn(),
  };

  const handlerParams = {
    getScopedClients,
    request: {},
    server: { isServerless: false },
    params: {},
    response: {},
    logger: { error: jest.fn() },
    context: {},
    telemetry,
  } as unknown as HandlerParams;

  return route.handler(handlerParams);
};

// Frozen searchable-snapshot indices report `size_in_bytes: 0`; their real size is in `total_data_set_size_in_bytes`.
const frozenStats = (totalDataSetSize: number): IndicesStatsIndicesStats =>
  ({
    primaries: { store: { size_in_bytes: 0, total_data_set_size_in_bytes: totalDataSetSize } },
  } as IndicesStatsIndicesStats);

const hotStats = (size: number): IndicesStatsIndicesStats =>
  ({
    primaries: { store: { size_in_bytes: size, total_data_set_size_in_bytes: size } },
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
});
