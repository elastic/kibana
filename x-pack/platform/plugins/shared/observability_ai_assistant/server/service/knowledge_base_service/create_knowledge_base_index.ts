/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { errors } from '@elastic/elasticsearch';
import { Logger } from '@kbn/logging';

export async function createKnowledgeBaseIndex({
  esClient,
  logger,
  indexName,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  indexName: string;
}) {
  logger.debug(`Creating knowledge base write index "${indexName}"`);

  try {
    await esClient.asInternalUser.indices.create({ index: indexName });
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      error?.body?.error?.type === 'resource_already_exists_exception'
    ) {
      throw new Error(
        `Write index "${indexName}" already exists. Please delete it before creating a new index.`
      );
    }
    logger.error(`Failed to create write index "${indexName}": ${error.message}`);
    throw error;
  }
}
