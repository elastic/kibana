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
  try {
    const { currentWriteIndexName, nextWriteIndexName } = await getCurrentAndNextWriteIndexName(
      esClient
    );

    if (!currentWriteIndexName || !nextWriteIndexName) {
      logger.debug('No knowledge base indices found. Skipping re-indexing.');
      return;
    }

    logger.info(
      `Re-indexing knowledge base from "${currentWriteIndexName}" to "${nextWriteIndexName}"...`
    );

    try {
      logger.debug(`Creating new KB index "${nextWriteIndexName}"...`);
      await esClient.asInternalUser.indices.create({ index: nextWriteIndexName });
    } catch (error) {
      if (
        error instanceof EsErrors.ResponseError &&
        error?.body?.error?.type === 'resource_already_exists_exception'
      ) {
        logger.error(
          `Re-index of knowledge base cannot continue since the target index "${nextWriteIndexName}" already exists. Please delete it or update the alias "${resourceNames.writeIndexAlias.kb}" to point to "${nextWriteIndexName}". Aborting.`
        );
        return;
      }
    }

    // Perform reindex to next index
    logger.debug(
      `Re-indexing knowledge base from ${currentWriteIndexName} to index "${nextWriteIndexName}"...`
    );
    await writeBlock({ esClient, index: currentWriteIndexName, isBlock: true });

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
      logger.warn('Re-indexing task ID not found. Skipping waiting for task to complete.');
    }

    // Delete original index
    logger.debug(`Deleting original index "${currentWriteIndexName}"`);
    await writeBlock({ esClient, index: currentWriteIndexName, isBlock: false });
    await esClient.asInternalUser.indices.delete({ index: currentWriteIndexName });

    // Re-create alias
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

    logger.info('Re-indexing knowledge base completed successfully.');
  } catch (error) {
    throw new Error(`Failed to reindex knowledge base: ${error.message}`);
  }
}

export async function getCurrentAndNextWriteIndexName(esClient: {
  asInternalUser: ElasticsearchClient;
}) {
  const response = await esClient.asInternalUser.indices.getAlias(
    { name: resourceNames.writeIndexAlias.kb },
    { ignore: [404] }
  );

  // const currentWriteIndexName = Object.keys(response)[0];

  const currentWriteIndexName = Object.entries(response).find(
    ([index, aliasInfo]) => aliasInfo.aliases[resourceNames.writeIndexAlias.kb]?.is_write_index
  )?.[0];

  if (!currentWriteIndexName) {
    return { currentWriteIndexName: undefined, nextWriteIndexName: undefined };
  }

  const latestIndexNumber = last(currentWriteIndexName.split('-'));
  if (!latestIndexNumber) {
    return { currentWriteIndexName: undefined, nextWriteIndexName: undefined };
  }

  // sequence number must be a six digit zero padded number like 000008 or 002201
  const isSequenceNumberValid = /^\d{6}$/.test(latestIndexNumber);
  if (!isSequenceNumberValid) {
    return { currentWriteIndexName: undefined, nextWriteIndexName: undefined };
  }

  const nextIndexSequenceNumber = (parseInt(latestIndexNumber, 10) + 1).toString().padStart(6, '0');
  const nextWriteIndexName = `${resourceNames.writeIndexAlias.kb}-${nextIndexSequenceNumber}`;

  return { currentWriteIndexName, nextWriteIndexName };
}

export function isKnowledgeBaseIndexWriteBlocked(error: any) {
  return (
    error instanceof EsErrors.ResponseError &&
    error.message.includes(`cluster_block_exception`) &&
    error.message.includes(resourceNames.writeIndexAlias.kb)
  );
}

function writeBlock({
  esClient,
  index,
  isBlock,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  index: string;
  isBlock: boolean;
}) {
  return esClient.asInternalUser.indices.putSettings({
    index,
    body: { 'index.blocks.write': isBlock },
  });
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
        logger.debug('Waiting for re-indexing task to complete...');
        throw new Error('Waiting for re-indexing task to complete...');
      }
    },
    { forever: true, maxTimeout: 10000 }
  );
}
