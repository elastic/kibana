/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { CoreSetup } from '@kbn/core/server';
import { LockManagerService } from '@kbn/lock-manager';
import { resourceNames } from '..';
import { createKbConcreteIndex } from '../startup_migrations/create_or_update_index_assets';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';

export const KB_REINDEXING_LOCK_ID = 'observability_ai_assistant:kb_reindexing';
export async function reIndexKnowledgeBaseWithLock({
  core,
  logger,
  esClient,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  logger: Logger;
  esClient: {
    asInternalUser: ElasticsearchClient;
  };
}): Promise<boolean> {
  const lmService = new LockManagerService(core, logger);
  return lmService.withLock(KB_REINDEXING_LOCK_ID, () =>
    reIndexKnowledgeBase({ logger, esClient })
  );
}

async function reIndexKnowledgeBase({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: {
    asInternalUser: ElasticsearchClient;
  };
}): Promise<boolean> {
  logger.debug('Initiating knowledge base re-indexing...');

  try {
    const originalIndex = resourceNames.concreteIndexName.kb;
    const tempIndex = `${resourceNames.aliases.kb}-000002`;

    // Create temporary index
    logger.debug(`Creating temporary index "${tempIndex}"...`);
    await esClient.asInternalUser.indices.delete({ index: tempIndex }, { ignore: [404] });
    await esClient.asInternalUser.indices.create({ index: tempIndex });

    // Perform reindex to temporary index
    logger.debug(`Re-indexing knowledge base to temporary index "${tempIndex}"...`);
    await esClient.asInternalUser.reindex({
      source: { index: originalIndex },
      dest: { index: tempIndex },
      refresh: true,
      wait_for_completion: true,
    });

    // Delete and re-create original index
    logger.debug(`Deleting original index "${originalIndex}" and re-creating it...`);
    await esClient.asInternalUser.indices.delete({ index: originalIndex });
    await createKbConcreteIndex({ logger, esClient });

    // Perform reindex back to original index
    logger.debug(`Re-indexing knowledge base back to original index "${originalIndex}"...`);
    await esClient.asInternalUser.reindex({
      source: { index: tempIndex },
      dest: { index: originalIndex },
      refresh: true,
      wait_for_completion: true,
    });

    // Delete temporary index
    logger.debug(`Deleting temporary index "${tempIndex}"...`);
    await esClient.asInternalUser.indices.delete({ index: tempIndex });

    logger.info('Re-indexing knowledge base completed successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to re-index knowledge base: ${error.message}`);
    throw new Error(`Failed to re-index knowledge base: ${error.message}`);
  }
}

export function isKnowledgeBaseIndexWriteBlocked(error: any) {
  return (
    error instanceof EsErrors.ResponseError &&
    error.message.includes(
      `cluster_block_exception: index [${resourceNames.concreteIndexName.kb}] blocked`
    )
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
