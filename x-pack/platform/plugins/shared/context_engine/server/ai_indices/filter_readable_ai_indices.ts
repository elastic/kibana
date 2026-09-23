/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { readableProbe, readableProbeFailure } from './readable_probe';

interface FilterReadableAiIndicesParams {
  esClient: ElasticsearchClient;
  aiIndices: AiIndexHttpItem[];
  logger: Logger;
}

/**
 * Keeps the AI Indices whose backing index the caller can read. One `msearch` as the caller, one
 * probe per entry. A backing index that does not exist yet is kept: the entry was just registered.
 */
export const filterReadableAiIndices = async ({
  esClient,
  aiIndices,
  logger,
}: FilterReadableAiIndicesParams): Promise<AiIndexHttpItem[]> => {
  if (aiIndices.length === 0) {
    return [];
  }

  const { responses } = await esClient.msearch({
    searches: aiIndices.flatMap(({ dest }) => readableProbe(dest.value)),
  });

  return aiIndices.filter((aiIndex, index) => {
    const failure = readableProbeFailure(aiIndex.dest.value, responses[index]);
    if (failure !== undefined) {
      logger.debug(`AI index '${aiIndex.id}' left out of the list: ${failure}`);
      return false;
    }
    return true;
  });
};
