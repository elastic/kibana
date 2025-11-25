/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createLocalDirDiskCacheStore, fromCache } from '@kbn/cache-cli';
import { createCache } from 'cache-manager';
import { errors } from '@elastic/elasticsearch';
import { PREDEFINED_HUGGING_FACE_DATASETS } from './datasets/config';
import type { HuggingFaceDatasetSpec } from './types';
import { ensureDatasetIndexExists } from './indexing/ensure_dataset_index_exists';
import { fetchRowsFromDataset } from './processing/fetch_rows_from_dataset';
import { indexDocuments } from './indexing/index_documents';
import { getEmbeddings } from './indexing/get_embeddings';

const DATASET_ROWS_CACHE = createCache({
  stores: [
    createLocalDirDiskCacheStore({
      dir: `hugging_face_dataset_rows`,
    }),
  ],
});

const DATASET_EMBEDDINGS_CACHE = createCache({
  stores: [
    createLocalDirDiskCacheStore({
      dir: `hugging_face_dataset_embeddings`,
    }),
  ],
});

export async function loadHuggingFaceDatasets({
  esClient,
  logger,
  accessToken,
  datasets = PREDEFINED_HUGGING_FACE_DATASETS,
  limit,
  clear = false,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  accessToken: string;
  datasets?: HuggingFaceDatasetSpec[];
  limit?: number;
  clear?: boolean;
}) {
  if (clear) {
    await esClient.indices
      .delete({
        index: datasets.map((dataset) => dataset.index),
        allow_no_indices: true,
      })
      .catch((error) => {
        if (error instanceof errors.ResponseError && error.statusCode === 404) {
          return;
        }
        throw error;
      });
  }

  for (const dataset of datasets) {
    logger.info(`Indexing dataset ${dataset.name}`);

    await ensureDatasetIndexExists({
      esClient,
      dataset,
    });

    const documents = await fromCache(dataset.name, DATASET_ROWS_CACHE, () =>
      fetchRowsFromDataset({
        dataset,
        logger,
        limit,
        accessToken,
      })
    );

    logger.debug(
      `Generating embeddings for ${documents.length} documents in dataset ${dataset.name}`
    );

    const docsWithEmbeddings = await fromCache(dataset.name, DATASET_EMBEDDINGS_CACHE, () =>
      getEmbeddings({
        esClient,
        documents,
        dataset,
        logger,
      })
    );
    logger.debug(`Indexing ${docsWithEmbeddings.length} documents with embeddings`);

    await indexDocuments({
      esClient,
      documents: docsWithEmbeddings,
      dataset,
      logger,
      bulkHelperOverrides: {
        // With embeddings already generated, larger flush size will not overload ELSER inference and improves performance
        flushBytes: 1024 * 1024,
      },
    });

    logger.info(`Indexed dataset`);
  }
}
