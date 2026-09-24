/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors } from '@elastic/elasticsearch';
import type { MsearchRequestItem, MsearchResponseItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ElasticsearchErrorDetails } from '@kbn/es-errors';
import { isResponseError } from '@kbn/es-errors';
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

/** Not every 403 is an authorization failure: a cluster read block is also a 403 and must surface. */
const isAuthorizationError = (error: unknown): error is errors.ResponseError =>
  isResponseError(error) &&
  error.statusCode === 403 &&
  (error.body as ElasticsearchErrorDetails | undefined)?.error?.type === 'security_exception';

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
 * Also the gate for describing a single entry, so both take the same privileges.
 */
export const filterReadableAiIndices = async ({
  esClient,
  aiIndices,
  logger,
}: FilterReadableAiIndicesParams): Promise<AiIndexHttpItem[]> => {
  if (aiIndices.length === 0) {
    return [];
  }

  const result = await esClient
    .msearch({ searches: aiIndices.flatMap(({ dest }) => probe(dest.value)) })
    .catch((error) => {
      // A caller with no search privilege on any index is refused the whole msearch.
      if (isAuthorizationError(error)) {
        logger.debug(`No AI index is readable: ${error.message}`);
        return undefined;
      }
      throw error;
    });
  if (result === undefined) {
    return [];
  }

  return aiIndices.filter((aiIndex, index) => {
    const response = result.responses[index];
    if (isMissingIndex(aiIndex.dest.value, response)) {
      return true;
    }
    const failure = failureReason(response);
    if (failure !== undefined) {
      logger.debug(`AI index '${aiIndex.id}' is not readable: ${failure}`);
      return false;
    }
    return true;
  });
};
