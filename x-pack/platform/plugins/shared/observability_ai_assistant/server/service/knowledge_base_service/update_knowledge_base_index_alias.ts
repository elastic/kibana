/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { resourceNames } from '..';
import { addIndexWriteBlock, removeIndexWriteBlock } from './index_write_block_utils';

export async function updateKnowledgeBaseWriteIndexAlias({
  esClient,
  logger,
  nextWriteIndexName,
  currentWriteIndexName,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  nextWriteIndexName: string;
  currentWriteIndexName: string;
}) {
  logger.debug(
    `Updating write index alias from "${currentWriteIndexName}" to "${nextWriteIndexName}"`
  );
  const alias = resourceNames.writeIndexAlias.kb;
  try {
    await addIndexWriteBlock({ esClient, index: currentWriteIndexName });
    logger.debug(
      `Added write block to "${currentWriteIndexName}". It is now read-only and writes are temporarily blocked.`
    );

    await esClient.asInternalUser.indices.updateAliases({
      actions: [
        { remove: { index: currentWriteIndexName, alias } },
        { add: { index: nextWriteIndexName, alias, is_write_index: true } },
      ],
    });
  } catch (error) {
    await removeIndexWriteBlock({ esClient, index: currentWriteIndexName });
    logger.error(
      `Failed to update write index alias: ${error.message}. Reverting back to ${currentWriteIndexName}`
    );
    throw error;
  }

  logger.debug(
    `Successfully updated write index alias to "${nextWriteIndexName}". Writes are now enabled again.`
  );
}
