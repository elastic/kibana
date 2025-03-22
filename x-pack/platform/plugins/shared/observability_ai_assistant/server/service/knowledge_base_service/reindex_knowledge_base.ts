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
    const { currentWriteIndexName, nextWriteIndexName } = await getCurrentWriteIndexName({
      logger,
      esClient,
    });

    if (!currentWriteIndexName || !nextWriteIndexName) {
      logger.debug('No knowledge base indices found. Skipping re-indexing.');
      return;
    }

    logger.info('Re-indexing knowledge base starting...');

    // Create next index
    logger.debug(`Creating new KB index "${nextWriteIndexName}"...`);
    // await esClient.asInternalUser.indices.delete({ index: nextWriteIndexName }, { ignore: [404] }); // cleanup if it already exists

    try {
      await esClient.asInternalUser.indices.create({ index: nextWriteIndexName });
    } catch (error) {
      if (
        error instanceof EsErrors.ResponseError &&
        error?.body?.error?.type === 'resource_already_exists_exception'
      ) {
        logger.error(
          `Re-index of knowledge base cannot continue since the target index "${nextWriteIndexName}" already exists. Please delete it or update the alias "${resourceNames.aliases.kb}" to point to "${nextWriteIndexName}". Aborting.`
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
          add: { index: nextWriteIndexName, alias: resourceNames.aliases.kb, is_write_index: true },
        },
      ],
    });

    logger.info('Re-indexing knowledge base completed successfully.');
  } catch (error) {
    throw new Error(`Failed to reindex knowledge base: ${error.message}`);
  }
}

export async function reIndexKnowledgeBaseIfSemanticTextIsUnsupported({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: { asInternalUser: ElasticsearchClient };
}) {
  const indexSettingsResponse = await esClient.asInternalUser.indices.getSettings({
    index: resourceNames.aliases.kb,
  });

  const results = Object.entries(indexSettingsResponse);
  if (results.length === 0) {
    logger.debug('No knowledge base indices found. Skipping re-indexing.');
    return;
  }

  const [indexName, { settings }] = results[0];
  const createdVersion = parseInt(settings?.index?.version?.created ?? '', 10);

  // Check if the index was created before version 8.11
  const versionThreshold = 8110000; // Version 8.11.0
  if (createdVersion >= versionThreshold) {
    logger.debug(
      `Knowledge base index "${indexName}" was created in version ${createdVersion}, and does not require re-indexing. Semantic text field is already supported. Aborting`
    );
    return;
  }

  logger.info(
    `Knowledge base index was created in ${createdVersion} and must be re-indexed in order to support semantic_text field. Re-indexing now...`
  );

  return reIndexKnowledgeBase({ logger, esClient });
}

export async function getCurrentWriteIndexName({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: { asInternalUser: ElasticsearchClient };
}) {
  const res = await esClient.asInternalUser.cat.indices({
    index: resourceNames.aliases.kb,
    format: 'json',
    h: ['index'],
  });

  const currentWriteIndexName = res[0]?.index;
  if (!currentWriteIndexName) {
    return { currentWriteIndexName: undefined, nextWriteIndexName: undefined };
  }

  const latestIndexNumber = last(currentWriteIndexName.split('-'))!;
  const nextIndexSequenceNumber = (parseInt(latestIndexNumber, 10) + 1).toString().padStart(6, '0');
  const nextWriteIndexName = `${resourceNames.aliases.kb}-${nextIndexSequenceNumber}`;

  return { currentWriteIndexName, nextWriteIndexName };
}

export function isKnowledgeBaseIndexWriteBlocked(error: any) {
  return (
    error instanceof EsErrors.ResponseError &&
    error.message.includes(`cluster_block_exception`) &&
    error.message.includes(resourceNames.aliases.kb)
  );
}

export function isSemanticTextUnsupportedError(error: Error) {
  const semanticTextUnsupportedError =
    'The [sparse_vector] field type is not supported on indices created on versions 8.0 to 8.10';

  const isSemanticTextUnspported =
    error instanceof EsErrors.ResponseError &&
    (error.message.includes(semanticTextUnsupportedError) ||
      // @ts-expect-error
      error.meta?.body?.error?.caused_by?.reason.includes(semanticTextUnsupportedError));

  return isSemanticTextUnspported;
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
