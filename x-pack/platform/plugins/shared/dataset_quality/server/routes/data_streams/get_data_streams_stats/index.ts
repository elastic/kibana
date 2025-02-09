/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { dataStreamService } from '../../../services';
import { indexStatsService } from '../../../services';

export async function getDataStreamsStats({
  esClient,
  dataStreams,
}: {
  esClient: ElasticsearchClient;
  dataStreams: string[];
}): Promise<
  Record<string, { size: string; sizeBytes: number; totalDocs: number; creationDate?: number }>
> {
  if (!dataStreams.length) {
    return {};
  }

  const matchingDataStreamsStats = dataStreamService.getStreamsStats(esClient, dataStreams);
  const indicesDocsCount = indexStatsService.getIndicesDocCounts(esClient, dataStreams);
  const matchingStreamsCreationDate = Promise.all(
    dataStreams.map(async (name) =>
      dataStreamService.getMatchingDataStreams(esClient, name).then(async ([result]) => {
        const oldestIndex = result?.indices[0];
        if (!oldestIndex) {
          return { name, creationDate: undefined };
        }

        const response = await esClient.indices.getSettings({ index: oldestIndex.index_name });
        const creationDate = response[oldestIndex.index_name].settings?.index?.creation_date;
        return { name, creationDate: creationDate ? Number(creationDate) : undefined };
      })
    )
  );

  const [indicesDocsCountStats, dataStreamsStats, dataStreamsCreationDate] = await Promise.all([
    indicesDocsCount,
    matchingDataStreamsStats,
    matchingStreamsCreationDate,
  ]);

  return dataStreamsStats.reduce(
    (acc, dataStream) => ({
      ...acc,
      [dataStream.data_stream]: {
        size: dataStream.store_size!.toString(),
        sizeBytes: dataStream.store_size_bytes,
        totalDocs: indicesDocsCountStats!.docsCountPerDataStream[dataStream.data_stream],
        creationDate: dataStreamsCreationDate.find((ds) => ds.name === dataStream.data_stream)
          ?.creationDate,
      },
    }),
    {}
  );
}
