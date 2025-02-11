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

export async function reIndexKnowledgeBase({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: {
    asInternalUser: ElasticsearchClient;
  };
}): Promise<void> {
  try {
    const originalIndex = `${resourceNames.aliases.kb}-000001`;
    const tempIndex = `${resourceNames.aliases.kb}-000002`;

    const indexSettings = await esClient.asInternalUser.indices.getSettings({
      index: originalIndex,
    });

    const createdVersion = parseInt(
      indexSettings[originalIndex]?.settings?.index?.version?.created ?? '',
      10
    );

    // Check if the index was created before version 8.11
    const versionThreshold = 8110000; // Version 8.11.0
    if (createdVersion >= versionThreshold) {
      logger.warn(
        `Knowledge base index "${originalIndex}" was created in version ${createdVersion}, and does not require reindexing. Semantic text field is already supported.`
      );
      return;
    }

    logger.info(
      `Knowledge base index was created in ${createdVersion} and must be re-indexed in order to support semantic_text field. Re-indexing now...`
    );

    // Prevent writes to original index
    await esClient.asInternalUser.indices.putSettings({
      index: originalIndex,
      body: { settings: { 'index.blocks.write': true } },
    });

    // Create temporary index
    await esClient.asInternalUser.indices.create({ index: tempIndex });

    // Perform reindex to temporary index
    await esClient.asInternalUser.reindex({
      body: {
        source: { index: originalIndex },
        dest: { index: tempIndex },
      },
      refresh: true,
      wait_for_completion: true,
    });

    // Delete original index
    await esClient.asInternalUser.indices.delete({
      index: originalIndex,
    });

    // Prevent writes to temporary index
    await esClient.asInternalUser.indices.putSettings({
      index: tempIndex,
      body: { settings: { 'index.blocks.write': true } },
    });

    // Re-create original index
    await esClient.asInternalUser.indices.create({
      index: originalIndex,
    });

    // Perform reindex back to original index
    await esClient.asInternalUser.reindex({
      body: {
        source: { index: tempIndex },
        dest: { index: originalIndex },
      },
      refresh: true,
      wait_for_completion: true,
    });

    // Delete temporary index
    await esClient.asInternalUser.indices.delete({
      index: tempIndex,
    });

    // Re-create aliases
    await esClient.asInternalUser.indices.updateAliases({
      body: {
        actions: [
          {
            add: {
              index: originalIndex,
              alias: resourceNames.aliases.kb,
              is_write_index: true,
            },
          },
        ],
      },
    });

    logger.info(
      'Reindexing knowledge base completed successfully. Semantic text field is now supported.'
    );
  } catch (error) {
    throw new Error(`Failed to reindex knowledge base: ${error.message}`);
  }
}

export function isKnowledgeBaseIndexWriteBlocked(error: any) {
  return (
    error instanceof EsErrors.ResponseError &&
    error.message.includes(
      `cluster_block_exception: index [${resourceNames.aliases.kb}-000001] blocked`
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
