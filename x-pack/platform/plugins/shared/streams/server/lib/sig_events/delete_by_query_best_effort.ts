/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const deleteByQueryBestEffort = async ({
  esClient,
  index,
  query,
}: {
  esClient: ElasticsearchClient;
  index: string;
  query: QueryDslQueryContainer;
}): Promise<number> => {
  try {
    const response = await esClient.deleteByQuery({
      index,
      conflicts: 'proceed',
      query,
    });
    return response.deleted ?? 0;
  } catch (error) {
    if (error instanceof errors.ResponseError && error.meta.statusCode === 404) {
      return 0;
    }
    throw error;
  }
};
