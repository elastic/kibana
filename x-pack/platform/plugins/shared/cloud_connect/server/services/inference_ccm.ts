/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export async function enableInferenceCCM(
  esClient: ElasticsearchClient,
  apiKey: string,
  logger: Logger
): Promise<void> {
  try {
    await esClient.transport.request({
      method: 'PUT',
      path: '/_inference/_ccm',
      body: {
        api_key: apiKey,
      },
    });

    logger.info('Inference CCM enabled successfully');
  } catch (error) {
    logger.error('Failed to enable inference CCM', { error });
    throw error;
  }
}

export async function disableInferenceCCM(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> {
  try {
    await esClient.transport.request({
      method: 'DELETE',
      path: '/_inference/_ccm',
    });

    logger.info('Inference CCM disabled successfully');
  } catch (error) {
    logger.error('Failed to disable inference CCM', { error });
    throw error;
  }
}
