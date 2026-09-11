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

const ATTACHMENT_ID_FIELD = 'attachments.id';

const SUBMIT_RETRIES = 5;
const POLL_ATTEMPTS = 720;
const POLL_INTERVAL_MS = 5_000;

interface UpdateByQueryTaskResponse {
  total?: number;
  updated?: number;
  version_conflicts?: number;
  failures?: unknown[];
}

const getWriteIndexName = async (esClient: ElasticsearchClient): Promise<string | undefined> => {
  const aliases = await esClient.indices.getAlias({ name: conversationIndexName });

  return Object.entries(aliases).find(
    ([, { aliases: indexAliases }]) => indexAliases[conversationIndexName]?.is_write_index === true
  )?.[0];
};

const isAttachmentIdMapped = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<boolean> => {
  const response = await esClient.indices.getFieldMapping({
    index,
    fields: ATTACHMENT_ID_FIELD,
  });

  return ATTACHMENT_ID_FIELD in (response[index]?.mappings ?? {});
};

const submitReindex = async (
  logger: Logger,
  esClient: ElasticsearchClient,
  reconcileMappings: () => Promise<void>
): Promise<string | undefined> =>
  pRetry(
    async () => {
      // The mapping must be in place before documents are re-indexed, otherwise the reindex writes
      // the same unmapped attachments back.
      await reconcileMappings();

      const response = await esClient.updateByQuery({
        index: conversationIndexName,
        conflicts: 'proceed',
        wait_for_completion: false,
        requests_per_second: REQUESTS_PER_SECOND,
        query: {
          bool: {
            must_not: [{ exists: { field: ATTACHMENT_ID_FIELD } }],
          },
        },
      });

      return response.task === undefined ? undefined : String(response.task);
    },
    {
      retries: SUBMIT_RETRIES,
      factor: 2,
      minTimeout: 1000,
      onFailedAttempt: (error) => {
        logger.warn(
          `Conversation attachments backfill attempt ${error.attemptNumber} failed (${error.retriesLeft} retries left): ${error.message}`
        );
      },
    }
  );

const reportReindexOutcome = async (
  logger: Logger,
  esClient: ElasticsearchClient,
  taskId: string
): Promise<void> => {
  try {
    await pRetry(
      async () => {
        const task = await esClient.tasks.get({ task_id: taskId, wait_for_completion: false });

        if (task.error) {
          throw new pRetry.AbortError(
            `Elasticsearch reported ${task.error.type}: ${task.error.reason ?? 'no reason given'}`
          );
        }

        if (!task.completed) {
          throw new Error(`task ${taskId} is still running`);
        }

        const {
          total,
          updated,
          version_conflicts: conflicts,
          failures,
        }: UpdateByQueryTaskResponse = task.response ?? {};

        if (failures && failures.length > 0) {
          throw new pRetry.AbortError(
            `${
              failures.length
            } document(s) could not be re-indexed. First failure: ${JSON.stringify(failures[0])}`
          );
        }

        logger.info(
          `Conversation attachments backfill completed: ${updated ?? 0} of ${
            total ?? 0
          } conversation(s) re-indexed, ${conflicts ?? 0} version conflict(s)`
        );
      },
      { retries: POLL_ATTEMPTS, factor: 1, minTimeout: POLL_INTERVAL_MS }
    );
  } catch (error) {
    logger.error(
      `Conversation attachments backfill did not complete cleanly, attachment filters may miss older conversations: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
};

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

  const writeIndex = await getWriteIndexName(esClient);

  if (!writeIndex) {
    logger.warn(
      `Skipping conversation attachments backfill: no write index is assigned to ${conversationIndexName}`
    );
    return;
  }

  if (await isAttachmentIdMapped(esClient, writeIndex)) {
    logger.debug(
      `Skipping conversation attachments backfill: ${ATTACHMENT_ID_FIELD} is already mapped on ${writeIndex}`
    );
    return;
  }

  const taskId = await submitReindex(logger, esClient, () => client.reconcileMappings());

  if (!taskId) {
    logger.warn(
      'Conversation attachments backfill was submitted but Elasticsearch returned no task id, so its outcome cannot be reported'
    );
    return;
  }

  logger.info(`Started conversation attachments backfill as task ${taskId}`);

  await reportReindexOutcome(logger, esClient, taskId);
};
