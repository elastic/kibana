/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import { inspect } from 'util';
import { HuggingFaceDatasetSpec } from './types';
import { ensureDatasetIndexExists } from './ensure_dataset_index_exists';

export async function indexDocuments({
  esClient,
  documents,
  dataset,
  logger,
}: {
  esClient: ElasticsearchClient;
  documents: Array<Record<string, unknown>>;
  dataset: HuggingFaceDatasetSpec;
  logger: Logger;
}): Promise<void> {
  const indexName = dataset.index;

  await ensureDatasetIndexExists({
    dataset,
    esClient,
  });

  logger.debug(`Indexing ${documents.length} into ${indexName}`);

  await esClient.helpers.bulk<Record<string, unknown>>({
    datasource: Readable.from(documents),
    index: indexName,
    retries: 2,
    concurrency: 1,
    flushBytes: 1024 * 128,
    onDocument: (document) => {
      const { _id, ...doc } = document;
      return [{ index: { _id: String(_id) } }, doc];
    },
    onDrop: (doc) => {
      logger.warn(`Dropped document: ${doc.status} (${inspect(doc.error, { depth: 5 })})`);
    },
    refresh: 'wait_for',
  });
}
