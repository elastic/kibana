/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { last } from 'lodash';
import pRetry from 'p-retry';
import { CoreSetup } from '@kbn/core/server';
import { LockManagerService } from '@kbn/lock-manager';
import { resourceNames } from '..';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import {
  addIndexWriteBlock,
  hasIndexWriteBlock,
  removeIndexWriteBlock,
} from './index_write_block_utils';
import { createKnowledgeBaseIndex } from './create_knowledge_base_index';
import { updateKnowledgeBaseWriteIndexAlias } from './update_knowledge_base_index_alias';

export const KB_REINDEXING_LOCK_ID = 'observability_ai_assistant:kb_reindexing';
export async function reIndexKnowledgeBaseWithLock({
  core,
  logger,
  esClient,
  inferenceId,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  logger: Logger;
  esClient: {
    asInternalUser: ElasticsearchClient;
  };
  inferenceId: string;
}): Promise<boolean> {
  const lmService = new LockManagerService(core, logger);
  return lmService.withLock(KB_REINDEXING_LOCK_ID, () =>
    reIndexKnowledgeBaseWithWriteIndexBlock({
      logger: logger.get('kb-reindex'),
      esClient,
      inferenceId,
    })
  );
}

async function reIndexKnowledgeBaseWithWriteIndexBlock({
  logger,
  esClient,
  inferenceId,
}: {
  logger: Logger;
  esClient: { asInternalUser: ElasticsearchClient };
  inferenceId: string;
}): Promise<boolean> {
  logger.debug('Initializing re-indexing of knowledge base...');
  if (await hasIndexWriteBlock({ esClient, index: resourceNames.writeIndexAlias.kb })) {
    throw new Error(
      `Write block is already set on the knowledge base index: ${resourceNames.writeIndexAlias.kb}`
    );
  }

  try {
    await addIndexWriteBlock({ esClient, index: resourceNames.writeIndexAlias.kb });
    await reIndexKnowledgeBase({ logger, esClient, inferenceId });
    logger.info('Re-indexing knowledge base completed successfully.');
  } catch (error) {
    logger.error(`Re-indexing knowledge base failed: ${error.message}`);
    throw error;
  } finally {
    await removeIndexWriteBlock({ esClient, index: resourceNames.writeIndexAlias.kb });
  }

  return true;
}

async function reIndexKnowledgeBase({
  logger,
  esClient,
  inferenceId,
}: {
  logger: Logger;
  esClient: { asInternalUser: ElasticsearchClient };
  inferenceId: string;
}): Promise<void> {
  const activeReindexingTask = await getActiveReindexingTaskId(esClient);
  if (activeReindexingTask) {
    throw new Error(
      `Re-indexing task "${activeReindexingTask}" is already in progress for the knowledge base index: ${resourceNames.writeIndexAlias.kb}`
    );
  }

  const { currentWriteIndexName, nextWriteIndexName } = await getCurrentAndNextWriteIndexNames({
    esClient,
    logger,
  });

  await createKnowledgeBaseIndex({ esClient, logger, inferenceId, indexName: nextWriteIndexName });

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
    throw new Error(`ID for re-indexing task was not found`);
  }

  // Delete original index
  logger.debug(`Deleting write index "${currentWriteIndexName}"`);
  await esClient.asInternalUser.indices.delete({ index: currentWriteIndexName });

  // Point write index alias to the new index
  await updateKnowledgeBaseWriteIndexAlias({ esClient, logger, index: nextWriteIndexName });
}

async function getCurrentWriteIndexName(esClient: { asInternalUser: ElasticsearchClient }) {
  const response = await esClient.asInternalUser.indices.getAlias(
    { name: resourceNames.writeIndexAlias.kb },
    { ignore: [404] }
  );

  const currentWriteIndexName = Object.entries(response).find(
    ([, aliasInfo]) => aliasInfo.aliases[resourceNames.writeIndexAlias.kb]?.is_write_index
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
    throw new Error(
      `"${currentWriteIndexName}" is not a valid write index name. Skipping re-indexing of knowledge base.`
    );
  }

  return { currentWriteIndexName, nextWriteIndexName };
}

export async function getActiveReindexingTaskId(esClient: { asInternalUser: ElasticsearchClient }) {
  const response = await esClient.asInternalUser.tasks.list({
    detailed: true,
    actions: ['indices:data/write/reindex'],
  });

  for (const node of Object.values(response.nodes ?? {})) {
    for (const [taskId, task] of Object.entries(node.tasks)) {
      if (task.description?.includes(resourceNames.writeIndexAlias.kb)) {
        return taskId;
      }
    }
  }
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
