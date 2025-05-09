/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';
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

export function isKnowledgeBaseIndexWriteBlocked(error: any) {
  return (
    error instanceof errors.ResponseError &&
    error.message.includes(`cluster_block_exception`) &&
    error.message.includes(resourceNames.writeIndexAlias.kb)
  );
}
