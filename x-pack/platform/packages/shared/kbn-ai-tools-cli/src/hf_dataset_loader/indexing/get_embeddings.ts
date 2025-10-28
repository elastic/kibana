/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { indexDocuments } from './index_documents';
import type { HuggingFaceDatasetSpec } from '../types';

export async function getEmbeddings({
  esClient,
  documents,
  dataset,
  logger,
}: {
  esClient: ElasticsearchClient;
  documents: Array<Record<string, unknown>>;
  dataset: HuggingFaceDatasetSpec;
  logger: Logger;
}): Promise<Array<Record<string, unknown>>> {
  const indexName = dataset.index + '_tmp';

  await indexDocuments({
    documents,
    dataset: {
      ...dataset,
      index: indexName,
    },
    esClient,
    logger,
  });

  const docsWithEmbeddings: Array<Record<string, unknown>> = [];
  const scrollDuration = '1m';
  const scrollSize = 1000;

  // Use scroll API to handle large datasets with 10k+ documents.
  let response = await esClient.search<Record<string, any>>({
    index: indexName,
    scroll: scrollDuration,
    size: scrollSize,
    fields: ['_inference_fields'],
    query: {
      match_all: {},
    },
  });

  const pushToDocsWithEmbeddings = (hit: Record<string, any>) => {
    const source = hit._source!;
    docsWithEmbeddings.push({ ...source, _id: hit._id });
  };

  // Process initial batch
  for (const hit of response.hits.hits) {
    pushToDocsWithEmbeddings(hit);
  }

  // Continue scrolling through all results
  while (response.hits.hits.length > 0) {
    response = await esClient.scroll({
      scroll_id: response._scroll_id!,
      scroll: scrollDuration,
    });

    for (const hit of response.hits.hits) {
      pushToDocsWithEmbeddings(hit);
    }
  }

  // Clear the scroll context
  if (response._scroll_id) {
    await esClient.clearScroll({ scroll_id: [response._scroll_id] }).catch((err) => {
      logger.warn(`Failed to clear scroll context: ${err.message}`);
    });
  }

  logger.info(`Retrieved ${docsWithEmbeddings.length} documents with embeddings`);

  await esClient.indices.delete({ index: indexName });

  return docsWithEmbeddings;
}
