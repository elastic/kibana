/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { last } from 'lodash';
import pRetry from 'p-retry';
import { resourceNames } from '..';

export async function reIndexKnowledgeBase({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: { asInternalUser: ElasticsearchClient };
}): Promise<void> {
  logger.debug('Initializing re-indexing of knowledge base...');
  await waitForWriteBlockToBeRemoved({ esClient, logger, index: resourceNames.writeIndexAlias.kb });
  await addIndexWriteBlock({ esClient, index: resourceNames.writeIndexAlias.kb });

  try {
    await _reIndexKnowledgeBase({ logger, esClient });
    logger.info('Re-indexing knowledge base completed successfully.');
  } catch (error) {
    if (error instanceof ReIndexAbortedError) {
      logger.warn(`Re-indexing knowledge base aborted: ${error.message}`);
      return;
    }

    logger.error(`Re-indexing knowledge base failed: ${error.message}`);
    throw error;
  } finally {
    await removeIndexWriteBlock({ esClient, index: resourceNames.writeIndexAlias.kb });
  }
}

async function _reIndexKnowledgeBase({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: { asInternalUser: ElasticsearchClient };
}): Promise<void> {
  const { currentWriteIndexName, nextWriteIndexName } = await getCurrentAndNextWriteIndexNames({
    esClient,
    logger,
  });

  logger.info(
    `Re-indexing knowledge base from "${currentWriteIndexName}" to index "${nextWriteIndexName}"...`
  );

  const reindexResponse = await esClient.asInternalUser.reindex({
    source: { index: currentWriteIndexName },
    dest: { index: nextWriteIndexName },
    refresh: true,
    wait_for_completion: false,
  });

  const taskId = reindexResponse.task?.toString();
  if (taskId) {
    await waitForReIndexTaskToComplete({ esClient, taskId, logger });
  } else {
    throw new ReIndexAbortedError(`'ID for re-indexing task was not found`);
  }

  // Delete original index
  logger.debug(`Deleting write index "${currentWriteIndexName}"`);
  await esClient.asInternalUser.indices.delete({ index: currentWriteIndexName });

  // Point write index alias to the new index
  logger.debug(`Updating write index alias to "${nextWriteIndexName}"`);
  await esClient.asInternalUser.indices.updateAliases({
    actions: [
      {
        add: {
          index: nextWriteIndexName,
          alias: resourceNames.writeIndexAlias.kb,
          is_write_index: true,
        },
      },
    ],
  });
}

async function getCurrentWriteIndexName(esClient: { asInternalUser: ElasticsearchClient }) {
  const response = await esClient.asInternalUser.indices.getAlias(
    { name: resourceNames.writeIndexAlias.kb },
    { ignore: [404] }
  );

  const currentWriteIndexName = Object.entries(response).find(
    ([index, aliasInfo]) => aliasInfo.aliases[resourceNames.writeIndexAlias.kb]?.is_write_index
  )?.[0];

  return currentWriteIndexName;
}

export function getNextWriteIndexName(currentWriteIndexName: string | undefined) {
  if (!currentWriteIndexName) {
    return;
  }

  const latestIndexNumber = last(currentWriteIndexName.split('-'));
  if (!latestIndexNumber) {
    return;
  }

  // sequence number must be a six digit zero padded number like 000008 or 002201
  const isSequenceNumberValid = /^\d{6}$/.test(latestIndexNumber);
  if (!isSequenceNumberValid) {
    return;
  }

  const nextIndexSequenceNumber = (parseInt(latestIndexNumber, 10) + 1).toString().padStart(6, '0');
  return `${resourceNames.writeIndexAlias.kb}-${nextIndexSequenceNumber}`;
}

export function isKnowledgeBaseIndexWriteBlocked(error: any) {
  return (
    error instanceof EsErrors.ResponseError &&
    error.message.includes(`cluster_block_exception`) &&
    error.message.includes(resourceNames.writeIndexAlias.kb)
  );
}

async function getCurrentAndNextWriteIndexNames({
  esClient,
  logger,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
}) {
  const currentWriteIndexName = await getCurrentWriteIndexName(esClient);
  const nextWriteIndexName = getNextWriteIndexName(currentWriteIndexName);
  if (!currentWriteIndexName || !nextWriteIndexName) {
    throw new ReIndexAbortedError(
      `"${currentWriteIndexName}" is not a valid write index name. Skipping re-indexing of knowledge base.`
    );
  }

  try {
    logger.debug(`Creating new write index "${nextWriteIndexName}"`);
    await esClient.asInternalUser.indices.create({ index: nextWriteIndexName });
  } catch (error) {
    if (
      error instanceof EsErrors.ResponseError &&
      error?.body?.error?.type === 'resource_already_exists_exception'
    ) {
      const existingTaskId = await getOngoingReindexTaskId(esClient, currentWriteIndexName);
      if (!existingTaskId) {
        throw new ReIndexAbortedError(`The target index "${nextWriteIndexName}" already exists.`);
      }

      logger.info(
        `Reindex operation already in progress (Task ID: ${existingTaskId}). Waiting for it to complete...`
      );
      await waitForReIndexTaskToComplete({ esClient, taskId: existingTaskId, logger });
      throw new ReIndexAbortedError(
        `Re-indexing was aborted because another re-index operation was in progress`
      );
    }
  }

  return { currentWriteIndexName, nextWriteIndexName };
}

function removeIndexWriteBlock({
  esClient,
  index,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  index: string;
}) {
  return esClient.asInternalUser.indices.putSettings({
    index,
    body: { 'index.blocks.write': false },
  });
}

async function getOngoingReindexTaskId(
  esClient: { asInternalUser: ElasticsearchClient },
  indexName: string
) {
  return pRetry(
    async () => {
      const response = await esClient.asInternalUser.tasks.list({
        detailed: true,
        actions: ['indices:data/write/reindex'],
      });

      for (const node of Object.values(response.nodes ?? {})) {
        for (const [taskId, task] of Object.entries(node.tasks)) {
          if (task.description?.includes(indexName)) {
            return taskId;
          }
        }
      }

      throw new Error('Re-index task not found. Maybe it is not running.');
    },
    { retries: 5, minTimeout: 500, factor: 1 }
  ).catch(() => {
    // if task id was not found after 5 retries, then return undefined
    return undefined;
  });
}

async function addIndexWriteBlock({
  esClient,
  index,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  index: string;
}) {
  await esClient.asInternalUser.indices.addBlock({ index, block: 'write' });
}

async function hasIndexWriteBlock({
  esClient,
  index,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  index: string;
}) {
  const response = await esClient.asInternalUser.indices.getSettings({ index });
  const writeBlockSetting = Object.values(response)[0]?.settings?.index?.blocks?.write;
  return writeBlockSetting === 'true' || writeBlockSetting === true;
}

export async function waitForWriteBlockToBeRemoved({
  esClient,
  logger,
  index,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  index: string;
}) {
  return pRetry(
    async () => {
      const isBlocked = await hasIndexWriteBlock({ esClient, index });
      if (isBlocked) {
        logger.debug(`Waiting for the write block to be removed from "${index}"...`);
        throw new Error(
          'Waiting for the re-index operation to complete and the write block to be removed...'
        );
      }
    },
    { forever: true, maxTimeout: 10000 }
  );
}

async function waitForReIndexTaskToComplete({
  esClient,
  taskId,
  logger,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  taskId: string;
  logger: Logger;
}): Promise<void> {
  return pRetry(
    async () => {
      const taskResponse = await esClient.asInternalUser.tasks.get({
        task_id: taskId,
        wait_for_completion: false,
      }); 

      if (!taskResponse.completed) {
        logger.debug(`Waiting for re-indexing task "${taskId}" to complete...`);
        throw new Error(`Waiting for re-indexing task "${taskId}" to complete...`);
      }
    },
    { forever: true, maxTimeout: 10000 }
  );
}

class ReIndexAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReIndexAbortedError';
  }
}
