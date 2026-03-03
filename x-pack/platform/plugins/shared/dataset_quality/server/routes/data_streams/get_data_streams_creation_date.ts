/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatIndicesIndicesRecord } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { dataStreamService } from '../../services';
import { processAsyncInChunks } from '../../utils/process_async_in_chunks';

export async function getDataStreamsCreationDate({
  esClient,
  dataStreams,
}: {
  esClient: ElasticsearchClient;
  dataStreams: string[];
}): Promise<Record<string, number | undefined>> {
  if (dataStreams.length === 0) {
    return {};
  }

  const matchingStreams = await processAsyncInChunks(dataStreams, (chunk) =>
    dataStreamService.getMatchingDataStreams(esClient, chunk)
  );

  const streamByIndex = matchingStreams.reduce((acc, { name, indices }) => {
    if (indices[0]) acc[indices[0].index_name] = name;
    return acc;
  }, {} as Record<string, string>);

  const indices = Object.keys(streamByIndex);
  if (indices.length === 0) {
    return {};
  }
  // While _cat api is not recommended for application use this is the only way
  // to retrieve the creation date in serverless for now. We should change this
  // once a proper approach exists (see elastic/elasticsearch-serverless#3010)
  const catIndices = await processAsyncInChunks(indices, (chunk) =>
    esClient.cat.indices({
      index: chunk,
      h: ['creation.date', 'index'],
      format: 'json',
    })
  );

  return (catIndices as CatIndicesIndicesRecord[]).reduce((acc, index) => {
    const creationDate = index['creation.date'];
    const indexName = index.index!;
    const stream = streamByIndex[indexName];

    acc[stream] = creationDate ? Number(creationDate) : undefined;
    return acc;
  }, {} as Record<string, number | undefined>);
}
