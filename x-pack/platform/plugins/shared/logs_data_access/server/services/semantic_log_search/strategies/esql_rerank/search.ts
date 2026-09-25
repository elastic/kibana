/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LogPattern,
  SemanticLogSearchParams,
  SemanticLogSearchResult,
} from '../../../../../common/services/semantic_log_search/types';
import {
  DEFAULT_MAX_PATTERNS,
  DEFAULT_RANK_WINDOW,
  RERANK_INFERENCE_TIMEOUT,
  RERANK_REQUEST_TIMEOUT_MS,
} from '../../constants';
import type { SemanticLogSearchDeps } from '../../types';
import { ERROR_REASON } from '../../../../../common/services/semantic_log_search/constants';
import { errorResult, SEARCH_PHASE, toFailureResult } from '../../results';
import { collectCandidates, selectRerankCandidates } from './collect_candidates';
import { buildRerankInputs } from './rerank_input';
import type { CountProbeResult, EsqlSearchScope } from './run_queries';
import { runCountProbe } from './run_queries';

/** Searches for log patterns matching a natural-language query using CATEGORIZE + inference RERANK. */
export async function searchWithEsqlRerank(
  params: SemanticLogSearchParams,
  deps: SemanticLogSearchDeps
): Promise<SemanticLogSearchResult> {
  const { logger, rerankInferenceId } = deps;
  const {
    esClient,
    target,
    nlQuery,
    timeRange,
    maxPatterns = DEFAULT_MAX_PATTERNS,
    kqlFilter,
    abortSignal,
  } = params;

  const scope: EsqlSearchScope = {
    target,
    startIso: new Date(timeRange.start).toISOString(),
    endIso: new Date(timeRange.end).toISOString(),
    kqlFilter,
  };

  // Step 1: cheap count probe with a short timeout.
  // A probe timeout or partial result means the scope is too broad to categorize in the full
  // budget — decline with guidance rather than consuming 30 s and still timing out.
  let probeResult: CountProbeResult;
  try {
    probeResult = await runCountProbe({ scope, esClient, abortSignal });
  } catch (error) {
    return toFailureResult(error, { logger, target, phase: SEARCH_PHASE.PROBE });
  }

  if (probeResult.status === 'incomplete') {
    logger.warn(
      `Semantic log search scope too large for target "${target}": count probe returned partial results`
    );
    return errorResult(ERROR_REASON.SCOPE_TOO_LARGE);
  }

  const { total } = probeResult;
  if (total === 0) {
    return { status: 'success', patterns: [] };
  }

  // Step 2: CATEGORIZE with adaptive sampling.
  let candidates: LogPattern[];
  try {
    candidates = await collectCandidates({ scope, total, esClient, abortSignal });
  } catch (error) {
    return toFailureResult(error, { logger, target, phase: SEARCH_PHASE.SEARCH });
  }

  if (candidates.length === 0) {
    return { status: 'success', patterns: [] };
  }

  const capped = selectRerankCandidates(candidates, DEFAULT_RANK_WINDOW);

  // Step 3: rerank the candidate set via the inference API, in its own phase so that a model that
  // is still loading is reported as `inference_not_ready` rather than as an oversized scope.
  // RERANK runs outside ES|QL because the two passes produce separate result sets that
  // ES|QL cannot union in a single statement.
  try {
    const rerankResponse = await esClient.inference.rerank(
      {
        inference_id: rerankInferenceId,
        query: nlQuery,
        input: buildRerankInputs(capped),
        top_n: maxPatterns,
        // Elasticsearch's own budget for the call, which defaults below what the local endpoint
        // needs for a full rank window. Without it the client `requestTimeout` below never applies.
        timeout: RERANK_INFERENCE_TIMEOUT,
        // We never read the echoed text; suppress it to avoid transferring the full input back.
        // Must stay inside `task_settings`: as a top-level field, non-`elasticsearch` inference
        // services reject it with `validation_exception`.
        task_settings: { return_documents: false },
      },
      { signal: abortSignal, requestTimeout: RERANK_REQUEST_TIMEOUT_MS }
    );

    // TODO: derive a "nothing relevant matched" signal from the top relevance_score and surface it
    // as a tool warning. Needs a threshold per endpoint rather than one constant, since the score
    // scale belongs to whichever endpoint `rerankInferenceId` names.
    const ranked = rerankResponse.rerank
      .slice()
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxPatterns) // defensive bound in case top_n is not honoured
      .flatMap((entry) => {
        const candidate = capped[entry.index];
        if (!candidate) return [];
        return [{ ...candidate, relevanceScore: entry.relevance_score }];
      });

    return { status: 'success', patterns: ranked };
  } catch (error) {
    return toFailureResult(error, { logger, target, phase: SEARCH_PHASE.RERANK });
  }
}
