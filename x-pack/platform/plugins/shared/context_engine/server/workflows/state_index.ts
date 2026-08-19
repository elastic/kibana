/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export const STATE_INDEX_NAME = '.kibana-context-engine-workflow-state';

const STATE_INDEX_MAPPINGS = {
  properties: {
    value: { type: 'keyword' as const },
    updated_at: { type: 'date' as const },
    workflow: { type: 'keyword' as const },
    signals_written: { type: 'long' as const },
  },
};

const STATE_INDEX_SETTINGS = {
  number_of_shards: 1,
  number_of_replicas: 0,
  hidden: true,
};

export const ensureStateIndexExists = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: STATE_INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: STATE_INDEX_NAME,
        settings: STATE_INDEX_SETTINGS,
        mappings: STATE_INDEX_MAPPINGS,
      });
      logger.info(`Created workflow state index: ${STATE_INDEX_NAME}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('resource_already_exists_exception')) {
      logger.debug(`State index ${STATE_INDEX_NAME} already exists`);
    } else {
      logger.warn(`Failed to create state index ${STATE_INDEX_NAME}`, { error });
      throw error;
    }
  }
};
