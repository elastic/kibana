/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { HuggingFaceDatasetSpec } from './types';

export async function ensureDatasetIndexExists({
  esClient,
  dataset,
  clear,
}: {
  esClient: ElasticsearchClient;
  dataset: HuggingFaceDatasetSpec;
  clear?: boolean;
}) {
  const { index, mapping } = dataset;

  let exists = await esClient.indices.exists({ index, allow_no_indices: true }).catch((error) => {
    if (error instanceof errors.ResponseError && error.statusCode === 404) {
      return false;
    }
    throw error;
  });

  if (clear && exists) {
    await esClient.indices.delete({ index, allow_no_indices: true });
    exists = false;
  }

  if (exists) {
    await esClient.indices.putMapping({
      ...mapping,
      index,
    });
  } else {
    await esClient.indices.create({
      index,
      mappings: mapping,
    });
  }
}
