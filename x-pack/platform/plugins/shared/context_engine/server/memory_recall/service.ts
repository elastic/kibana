/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RECALL_CANDIDATE_POOL, RECALL_STORE_WEIGHTS } from '../../common/constants';
import type {
  RecallRequest,
  RecallResponse,
  RecallSource,
} from '../../common/http_api/memory_recall';
import { RECALL_SOURCES } from '../../common/http_api/memory_recall';
import type { ContextEngineAnalyticsService } from '../telemetry';
import { errorTypeForTelemetry } from '../telemetry';
import { estimateTokens, packResults } from './pack';
import { renderContext } from './render';
import { rerankCandidates } from './rerank';
import type { RecallStore } from './types';

/** Each included store's share of the candidate pool, in proportion to its weight. */
const splitCandidatePool = (sources: RecallSource[]): Map<RecallSource, number> => {
  const totalWeight = sources.reduce((sum, source) => sum + RECALL_STORE_WEIGHTS[source], 0);
  let remaining = RECALL_CANDIDATE_POOL;
  return new Map(
    sources.map((source, position) => {
      const share =
        position === sources.length - 1
          ? remaining
          : Math.round((RECALL_CANDIDATE_POOL * RECALL_STORE_WEIGHTS[source]) / totalWeight);
      remaining -= share;
      return [source, share];
    })
  );
};

/**
 * Searches the included stores, reranks their candidates together, and fills the response up to
 * `max_tokens`.
 */
export const recall = async ({
  esClient,
  stores,
  analyticsService,
  request,
}: {
  esClient: ElasticsearchClient;
  stores: RecallStore[];
  analyticsService: Pick<ContextEngineAnalyticsService, 'reportMemoryRecall'>;
  request: RecallRequest;
}): Promise<RecallResponse> => {
  const startedAt = Date.now();
  const {
    query,
    user_id: userId,
    session_ids: sessionIds,
    include,
    max_tokens: maxTokens,
    format,
  } = request;
  const aiIndexIds = include.ai_index_ids;
  const limits = splitCandidatePool(
    RECALL_SOURCES.filter((source) =>
      source === 'ai_index' ? aiIndexIds.length > 0 : include[source]
    )
  );
  try {
    const found = await Promise.all(
      stores.flatMap((store) => {
        const limit = limits.get(store.source);
        return limit === undefined
          ? []
          : [store.search({ query, limit, userId, sessionIds, aiIndexIds })];
      })
    );
    const candidates = found.flat();
    const ranked = await rerankCandidates({ esClient, query, candidates });
    const { results, tokens } = packResults({ ranked, maxTokens });
    const context = format === 'text' ? renderContext(results) : undefined;
    const tookMs = Date.now() - startedAt;
    analyticsService.reportMemoryRecall({
      outcome: 'success',
      totalMs: tookMs,
      tokensReturned: context === undefined ? tokens : estimateTokens(context),
      candidatesReranked: candidates.length,
    });
    return context === undefined ? { results, took_ms: tookMs } : { context, took_ms: tookMs };
  } catch (error) {
    analyticsService.reportMemoryRecall({
      outcome: 'failure',
      totalMs: Date.now() - startedAt,
      errorType: errorTypeForTelemetry(error),
    });
    throw error;
  }
};
