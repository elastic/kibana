/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

export async function deleteInferenceEndpoint({
  esClient,
  logger,
  inferenceId,
  taskType,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  inferenceId: string;
  taskType: InferenceTaskType;
}) {
  try {
    logger.info(
      `Attempting to delete inference endpoint with ID: ${inferenceId} and task type: ${taskType}`
    );
    await esClient.asInternalUser.inference.delete({
      inference_id: inferenceId,
      task_type: taskType,
    });
    logger.info(`Successfully deleted inference endpoint with ID: ${inferenceId}`);
  } catch (error) {
    logger.error(
      `Failed to delete inference endpoint with ID: ${inferenceId}. Error: ${error.message}`
    );
  }
}
