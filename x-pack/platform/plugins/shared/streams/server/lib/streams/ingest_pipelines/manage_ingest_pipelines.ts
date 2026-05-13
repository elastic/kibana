/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { getErrorMessage } from '../errors/parse_error';
import { retryTransientEsErrors } from '../helpers/retry';

interface DeletePipelineOptions {
  esClient: ElasticsearchClient;
  id: string;
  logger: Logger;
}

interface PipelineManagementOptions {
  esClient: ElasticsearchClient;
  pipeline: IngestPutPipelineRequest;
  logger: Logger;
}

export async function deleteIngestPipeline({ esClient, id, logger }: DeletePipelineOptions) {
  try {
    await retryTransientEsErrors(() => esClient.ingest.deletePipeline({ id }, { ignore: [404] }), {
      logger,
    });
  } catch (error) {
    logger.error(`Error deleting ingest pipeline: ${getErrorMessage(error)}`);
    throw error;
  }
}

export async function upsertIngestPipeline({
  esClient,
  pipeline,
  logger,
}: PipelineManagementOptions) {
  try {
    await retryTransientEsErrors(() => esClient.ingest.putPipeline(pipeline), { logger });
    logger.debug(() => `Installed ingest pipeline: ${JSON.stringify(pipeline)}`);
  } catch (error) {
    logger.error(`Error updating ingest pipeline: ${getErrorMessage(error)}`);
    throw error;
  }
}
