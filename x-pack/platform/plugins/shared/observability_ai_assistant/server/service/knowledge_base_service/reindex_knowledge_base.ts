/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { resourceNames } from '..';
import { createKbConcreteIndex } from '../create_or_update_index_assets';

export async function reIndexKnowledgeBase({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: {
    asInternalUser: ElasticsearchClient;
  };
}): Promise<void> {
  logger.debug('Initiating knowledge base re-indexing...');

  try {
    const originalIndex = resourceNames.concreteIndexName.kb;
    const tempIndex = `${resourceNames.aliases.kb}-000002`;

    const indexSettingsResponse = await esClient.asInternalUser.indices.getSettings({
      index: originalIndex,
    });

    const indexSettings = indexSettingsResponse[originalIndex].settings;
    const createdVersion = parseInt(indexSettings?.index?.version?.created ?? '', 10);

    // Check if the index was created before version 8.11
    const versionThreshold = 8110000; // Version 8.11.0
    if (createdVersion >= versionThreshold) {
      logger.warn(
        `Knowledge base index "${originalIndex}" was created in version ${createdVersion}, and does not require re-indexing. Semantic text field is already supported. Aborting`
      );
      return;
    }

    logger.info(
      `Knowledge base index was created in ${createdVersion} and must be re-indexed in order to support semantic_text field. Re-indexing now...`
    );

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

    logger.info(
      'Re-indexing knowledge base completed successfully. Semantic text field is now supported.'
    );
  } catch (error) {
    throw new Error(`Failed to reindex knowledge base: ${error.message}`);
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
