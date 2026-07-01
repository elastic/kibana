/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { getDataStreamsMeteringStats, processAsyncInChunks } from '../doc_counts/utils';

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
    const { data_streams: dataStreams } = await esClient.indices.getDataStream();

    if (!dataStreams.length) {
      return [];
    }

    const dataStreamNames = dataStreams.map((ds) => ds.name);
    const sizeByStream: Record<string, number> = {};

    if (server.isServerless) {
      const meteringClient = isSecurityEnabled ? scopedClusterClient.asSecondaryAuthUser : esClient;

      const statsByStream = await getDataStreamsMeteringStats({
        esClient: meteringClient,
        dataStreams: dataStreamNames,
      });

      for (const [stream, stats] of Object.entries(statsByStream)) {
        sizeByStream[stream] = stats.sizeBytes;
      }
    } else {
      const backingIndexToStream = new Map<string, string>();
      for (const ds of dataStreams) {
        for (const idx of ds.indices) {
          backingIndexToStream.set(idx.index_name, ds.name);
        }
      }

      const statsResponses = await processAsyncInChunks<
        string,
        { indices?: Record<string, IndicesStatsIndicesStats> }
      >({
        items: dataStreamNames,
        processChunk: async (chunk) =>
          esClient.indices.stats({
            index: chunk,
            metric: ['store'],
            // Using `total_data_set_size_in_bytes` so DLM frozen (searchable-snapshot) data is counted in total size.
            filter_path: 'indices.*.primaries.store.total_data_set_size_in_bytes',
          }),
      });

      for (const statsResponse of statsResponses) {
        if (!statsResponse.indices) continue;
        for (const [indexName, stats] of Object.entries(statsResponse.indices)) {
          const sizeBytes = stats.primaries?.store?.total_data_set_size_in_bytes ?? 0;
          const stream = backingIndexToStream.get(indexName) ?? indexName;
          sizeByStream[stream] = (sizeByStream[stream] ?? 0) + sizeBytes;
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
