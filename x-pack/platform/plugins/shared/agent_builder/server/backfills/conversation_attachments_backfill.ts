/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { conversationIndexName, createStorage } from '../services/conversation/client/storage';

const REQUESTS_PER_SECOND = 500;

/**
 * Re-indexes conversations whose attachments predate the `attachments.id` / `attachments.type`
 * mappings so they become searchable by attachment.
 */
export const runConversationAttachmentsBackfill = async (
  logger: Logger,
  esClient: ElasticsearchClient
): Promise<void> => {
  const storage = createStorage({ logger, esClient });
  const client = storage.getClient();

  if (!(await client.existsIndex())) {
    logger.debug(
      'Skipping conversation attachments backfill: the conversation index does not exist yet'
    );
    return;
  }

  await pRetry(
    async () => {
      // The mapping must be in place before documents are re-indexed, otherwise the reindex writes
      // the same unmapped attachments back.
      await client.reconcileMappings();

      const response = await esClient.updateByQuery({
        index: conversationIndexName,
        conflicts: 'proceed',
        wait_for_completion: false,
        requests_per_second: REQUESTS_PER_SECOND,
        query: {
          bool: {
            must_not: [{ exists: { field: 'attachments.id' } }],
          },
        },
      });

      logger.info(
        `Started conversation attachments backfill as task ${response.task ?? '<unknown>'}`
      );
    },
    {
      retries: 5,
      factor: 2,
      minTimeout: 1000,
      onFailedAttempt: (error) => {
        logger.warn(
          `Conversation attachments backfill attempt ${error.attemptNumber} failed (${error.retriesLeft} retries left): ${error.message}`
        );
      },
    }
  );
};
