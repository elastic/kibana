/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Readable } from 'stream';
import { inspect } from 'util';
import type { BulkHelperOptions } from '@elastic/elasticsearch/lib/helpers';
import type { HuggingFaceDatasetSpec } from '../types';
import { ensureDatasetIndexExists } from './ensure_dataset_index_exists';

export async function indexDocuments({
  esClient,
  documents,
  dataset,
  logger,
  bulkHelperOverrides,
}: {
  esClient: ElasticsearchClient;
  documents: Array<Record<string, unknown>>;
  dataset: HuggingFaceDatasetSpec;
  logger: Logger;
  bulkHelperOverrides?: Omit<
    BulkHelperOptions<Record<string, unknown>>,
    'datasource' | 'onDocument'
  >;
}): Promise<void> {
  const indexName = dataset.index;

  await ensureDatasetIndexExists({
    dataset,
    esClient,
  });

  logger.debug(`Indexing ${documents.length} into ${indexName}`);

  const startTime = Date.now();

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
    ...bulkHelperOverrides,
  });

  const endTime = Date.now();
  const elapsedTimeMs = endTime - startTime;
  const elapsedTimeSec = elapsedTimeMs / 1000;
  const docsPerSecond = documents.length / elapsedTimeSec;

  logger.debug(
    `Indexing completed in ${elapsedTimeSec.toFixed(2)}s (${docsPerSecond.toFixed(2)} docs/sec)`
  );
}
