/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { indexDocuments } from './index_documents';
import { HuggingFaceDatasetSpec } from './types';

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

  const docsWithEmbeddings = await esClient
    .search<Record<string, any>>({
      index: indexName,
      size: documents.length,
      fields: ['_inference_fields'],
    })
    .then((response) =>
      response.hits.hits.map((hit) => {
        const source = hit._source!;
        Object.entries(source._inference_fields ?? {}).forEach(([fieldName, config]) => {
          delete (config as Record<string, any>).inference.model_settings.service;
        });
        return source;
      })
    );

  await esClient.indices.delete({ index: indexName });

  return docsWithEmbeddings;
}
