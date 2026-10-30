/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createAiIndexStorageClient, type StoredAiIndexDocument } from './storage';

export const legacyAiIndicesIndexName = '.contextengine-ai-indices';

const MAX_MIGRATED_AI_INDICES = 10_000;

/** Moves legacy registry entries to the current index; safe to rerun. */
export const migrateLegacyAiIndices = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const legacyIndices = await esClient.indices.get({
    index: legacyAiIndicesIndexName,
    features: ['aliases'],
    ignore_unavailable: true,
  });
  const legacyIndexNames = Object.keys(legacyIndices);
  if (legacyIndexNames.length === 0) {
    return;
  }

  const response = await esClient.search<StoredAiIndexDocument>({
    index: legacyAiIndicesIndexName,
    size: MAX_MIGRATED_AI_INDICES,
    track_total_hits: false,
    query: { match_all: {} },
  });
  const operations = response.hits.hits.flatMap(({ _id: id, _source: document }) =>
    id !== undefined && document ? [{ create: { _id: id, document } }] : []
  );

  if (operations.length > 0) {
    const storageClient = createAiIndexStorageClient({ esClient, logger });
    const { items } = await storageClient.bulk({ operations });
    const failed = items.filter(({ create }) => create?.error && create.status !== 409);
    if (failed.length > 0) {
      throw new Error(
        `Failed to copy ${failed.length} of ${operations.length} entries from ${legacyAiIndicesIndexName}`
      );
    }
  }

  await esClient.indices.delete({ index: legacyIndexNames });
  await esClient.indices.deleteIndexTemplate({ name: legacyAiIndicesIndexName }, { ignore: [404] });
  logger.info(
    `Migrated ${operations.length} AI index entries from ${legacyAiIndicesIndexName} and removed it`
  );
};
