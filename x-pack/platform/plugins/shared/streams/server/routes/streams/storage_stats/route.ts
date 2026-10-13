/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import {
  getDataStreamsMeteringStats,
  getDataStreamsWithIndexNames,
  processAsyncInChunks,
} from '../doc_counts/utils';

export interface StreamStorageStat {
  stream: string;
  store_size_bytes: number;
}

const bulkStorageStatsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/storage_stats',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ getScopedClients, request, server }): Promise<StreamStorageStat[]> => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
    const esClient = scopedClusterClient.asCurrentUser;

    // Streams without backing datastreams (query, draft) have no storage size associated with them.
    const dataStreams = await getDataStreamsWithIndexNames({ esClient });

    if (!dataStreams.length) {
      return [];
    }

    const dataStreamNames = dataStreams.map((ds) => ds.name);
    const sizeByStream: Record<string, number> = {};

    // Both stats APIs report sizes per backing index, so sum them up per stream.
    const backingIndexToStream = new Map<string, string>();
    for (const ds of dataStreams) {
      for (const idx of ds.indices) {
        backingIndexToStream.set(idx.index_name, ds.name);
      }
    }
    const addIndexSize = (indexName: string, sizeBytes: number) => {
      const stream = backingIndexToStream.get(indexName) ?? indexName;
      sizeByStream[stream] = (sizeByStream[stream] ?? 0) + sizeBytes;
    };

    if (server.isServerless) {
      const meteringClient = isSecurityEnabled ? scopedClusterClient.asSecondaryAuthUser : esClient;

      const statsByIndex = await getDataStreamsMeteringStats({
        esClient: meteringClient,
        dataStreams: dataStreamNames,
      });

      for (const [indexName, { sizeBytes }] of Object.entries(statsByIndex)) {
        addIndexSize(indexName, sizeBytes);
      }
    } else {
      const statsResponses = await processAsyncInChunks<
        string,
        { indices?: Record<string, IndicesStatsIndicesStats> }
      >({
        items: dataStreamNames,
        processChunk: async (chunk) =>
          esClient.indices.stats({
            index: chunk,
            metric: ['store'],
            // Use `total` (primaries + replicas) to stay consistent with getDslPhaseStats so
            // per-phase sizes always sum to the stream total, even with replication > 0.
            filter_path: 'indices.*.total.store.total_data_set_size_in_bytes',
          }),
      });

      for (const statsResponse of statsResponses) {
        if (!statsResponse.indices) continue;
        for (const [indexName, stats] of Object.entries(statsResponse.indices)) {
          addIndexSize(indexName, stats.total?.store?.total_data_set_size_in_bytes ?? 0);
        }
      }
    }

    return Object.entries(sizeByStream)
      .filter(([, size]) => size > 0)
      .map(([stream, size]) => ({ stream, store_size_bytes: size }));
  },
});

export const storageStatsRoutes = {
  ...bulkStorageStatsRoute,
};
