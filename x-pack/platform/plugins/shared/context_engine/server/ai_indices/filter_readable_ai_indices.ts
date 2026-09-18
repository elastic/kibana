/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchRequestItem, MsearchResponseItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';

interface FilterReadableAiIndicesParams {
  esClient: ElasticsearchClient;
  aiIndices: AiIndexHttpItem[];
  logger: Logger;
}

/** Strict index options on purpose: `ignore_unavailable` silently drops unreadable indices. */
const probe = (target: string): MsearchRequestItem[] => [
  { index: target, allow_partial_search_results: false },
  { size: 0, terminate_after: 1, track_total_hits: false, query: { match_all: {} } },
];

/** Single expression only: `existing,missing` is also a 404 and says nothing about `existing`. */
const isMissingIndex = (target: string, item: MsearchResponseItem): boolean =>
  !target.includes(',') && 'error' in item && item.error.type === 'index_not_found_exception';

/** Error, timeout, or failed shard; undefined when the probe can be trusted. */
const failureReason = (item: MsearchResponseItem): string | undefined => {
  if ('error' in item) {
    return item.error.reason ?? item.error.type;
  }
  if (item.timed_out) {
    return 'timed out';
  }
  if (item._shards.failed > 0) {
    return `${item._shards.failed} shard(s) failed`;
  }
  return undefined;
};

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
    searches: aiIndices.flatMap(({ dest }) => probe(dest.value)),
  });

  return aiIndices.filter((aiIndex, index) => {
    const response = responses[index];
    if (isMissingIndex(aiIndex.dest.value, response)) {
      return true;
    }
    const failure = failureReason(response);
    if (failure !== undefined) {
      logger.debug(`AI index '${aiIndex.id}' left out of the list: ${failure}`);
      return false;
    }
    return true;
  });
};
