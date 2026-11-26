/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { AiIndexWriteForbiddenError } from './errors';
import type { AiIndexService } from './service';

/**
 * Throws `AiIndexNotFoundError` for an AI index missing from the space, and `AiIndexWriteForbiddenError`
 * when `esClient`'s user lacks `write` on an AI index's backing index.
 */
export const assertAiIndicesWritable = async ({
  aiIndexService,
  esClient,
  spaceId,
  aiIndexIds,
}: {
  aiIndexService: Pick<AiIndexService, 'get'>;
  esClient: ElasticsearchClient;
  spaceId: string;
  aiIndexIds: readonly string[];
}): Promise<void> => {
  const uniqueIds = [...new Set(aiIndexIds)];
  if (uniqueIds.length === 0) {
    return;
  }

  const aiIndices = await Promise.all(uniqueIds.map((id) => aiIndexService.get(id, spaceId)));
  const uniqueDests = [...new Set(aiIndices.map(({ dest }) => dest.value))];
  const { index } = await esClient.security.hasPrivileges({
    index: [{ names: uniqueDests, privileges: ['write'] }],
  });

  const notWritable = aiIndices.find(({ dest }) => index[dest.value]?.write !== true);
  if (notWritable) {
    throw new AiIndexWriteForbiddenError(notWritable.id);
  }
};
