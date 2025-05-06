/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import { resourceNames } from '..';

export async function addIndexWriteBlock({
  esClient,
  index,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  index: string;
}) {
  await esClient.asInternalUser.indices.addBlock({ index, block: 'write' });
}

export function removeIndexWriteBlock({
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

export async function hasIndexWriteBlock({
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

export function isKnowledgeBaseIndexWriteBlocked(error: any) {
  return (
    error instanceof errors.ResponseError &&
    error.message.includes(`cluster_block_exception`) &&
    error.message.includes(resourceNames.writeIndexAlias.kb)
  );
}
