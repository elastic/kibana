/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchRequestItem, MsearchResponseItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';

interface ProbeAiIndicesParams {
  esClient: ElasticsearchClient;
  aiIndices: AiIndexHttpItem[];
  logger: Logger;
}

export interface ProbedAiIndex {
  aiIndex: AiIndexHttpItem;
  /** Absent when readable. `privilege` is true for a refusal, false for unavailability. */
  failure?: { reason: string; privilege: boolean };
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

/** A closed index or a cluster block is also a per-probe error, but not a privilege refusal. */
const isPrivilegeFailure = (item: MsearchResponseItem): boolean =>
  'error' in item && item.status === 403 && item.error.type === 'security_exception';

/**
 * Probes whether the caller can read each AI Index's backing index: one `msearch` as the caller,
 * one probe per entry. A backing index that does not exist yet is readable: the entry was just
 * registered. A caller with no read privilege on any index is refused the whole `msearch`: that
 * 403 propagates.
 */
export const probeAiIndices = async ({
  esClient,
  aiIndices,
  logger,
}: ProbeAiIndicesParams): Promise<ProbedAiIndex[]> => {
  if (aiIndices.length === 0) {
    return [];
  }

  const { responses } = await esClient.msearch({
    searches: aiIndices.flatMap(({ dest }) => probe(dest.value)),
  });

  return aiIndices.map((aiIndex, index) => {
    const response = responses[index];
    if (isMissingIndex(aiIndex.dest.value, response)) {
      return { aiIndex };
    }
    const reason = failureReason(response);
    if (reason === undefined) {
      return { aiIndex };
    }
    logger.debug(`AI index '${aiIndex.id}' is not readable: ${reason}`);
    return { aiIndex, failure: { reason, privilege: isPrivilegeFailure(response) } };
  });
};

/** Keeps the AI Indices whose probe succeeded, dropping failures of either kind. */
export const filterReadableAiIndices = async (
  params: ProbeAiIndicesParams
): Promise<AiIndexHttpItem[]> =>
  (await probeAiIndices(params))
    .filter(({ failure }) => failure === undefined)
    .map(({ aiIndex }) => aiIndex);
