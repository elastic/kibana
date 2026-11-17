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
    const [pinned, found] = await Promise.all([
      userId ? Promise.all(stores.map((store) => store.pinned?.(userId) ?? [])) : [],
      Promise.all(
        stores
          .filter(({ source }) => sources.includes(source))
          .map((store) => store.search({ query, userId, sessionIds, aiIndexIds }))
      ),
    ]);
    const candidates = found.flat();
    const ranked = await rerankCandidates({ esClient, query, candidates });
    const packed = packResults({ pinned: pinned.flat(), ranked, maxTokens });
    const context = format === 'text' ? renderContext(packed.results) : undefined;
    const usage = {
      took_ms: Date.now() - startedAt,
      tokens: context === undefined ? packed.tokens : estimateTokens(context),
    };
    analyticsService.reportMemoryRecall({
      outcome: 'success',
      totalMs: usage.took_ms,
      tokensReturned: usage.tokens,
      candidatesReranked: candidates.length,
    });
    return context === undefined ? { results: packed.results, ...usage } : { context, ...usage };
  } catch (error) {
    analyticsService.reportMemoryRecall({
      outcome: 'failure',
      totalMs: Date.now() - startedAt,
      errorType: errorTypeForTelemetry(error),
    });
    throw error;
  }
};
