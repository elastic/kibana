/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RecallRequest, RecallResponse } from '../../common/http_api/memory_recall';
import type { ContextEngineAnalyticsService } from '../telemetry';
import { errorTypeForTelemetry } from '../telemetry';
import { estimateTokens, packResults } from './pack';
import { renderContext } from './render';
import { rerankCandidates } from './rerank';
import type { RecallStore } from './types';

/**
 * Searches the requested stores, reranks their candidates together, and fills the response up to
 * `max_tokens`, with the user's pinned memories first.
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
    ai_index_ids: aiIndexIds,
    sources,
    max_tokens: maxTokens,
    format,
  } = request;
  try {
    const [pinned, candidates] = await Promise.all([
      userId ? Promise.all(stores.map((store) => store.pinned?.(userId) ?? [])) : [],
      Promise.all(
        stores
          .filter(({ source }) => sources.includes(source))
          .map((store) => store.search({ query, userId, sessionIds, aiIndexIds }))
      ),
    ]);
    const ranked = await rerankCandidates({ esClient, query, candidates: candidates.flat() });
    const { results, tokens } = packResults({ pinned: pinned.flat(), ranked, maxTokens });
    const context = format === 'text' ? renderContext(results) : undefined;
    const tokensReturned = context === undefined ? tokens : estimateTokens(context);
    const tookMs = Date.now() - startedAt;
    analyticsService.reportMemoryRecall({
      outcome: 'success',
      totalMs: tookMs,
      tokensReturned,
      candidatesReranked: candidates.flat().length,
    });
    return context === undefined
      ? { results, took_ms: tookMs, tokens: tokensReturned }
      : { context, took_ms: tookMs, tokens: tokensReturned };
  } catch (error) {
    analyticsService.reportMemoryRecall({
      outcome: 'failure',
      totalMs: Date.now() - startedAt,
      errorType: errorTypeForTelemetry(error),
    });
    throw error;
  }
};
