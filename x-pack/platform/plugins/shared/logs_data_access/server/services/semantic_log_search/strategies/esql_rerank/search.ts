/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  LogPattern,
  SemanticLogSearchParams,
  SemanticLogSearchResult,
} from '../../../../../common/services/semantic_log_search/types';
import {
  DEFAULT_MAX_PATTERNS,
  DEFAULT_RANK_WINDOW,
  ESQL_REQUEST_TIMEOUT_MS,
  MAX_RERANK_INPUT_LENGTH,
  RERANK_ENDPOINT,
} from '../../constants';
import { ERROR_REASON } from '../../../../../common/services/semantic_log_search/constants';
import { errorResult, SEARCH_PHASE, toFailureResult } from '../../results';
import { collectCandidates, selectRerankCandidates } from './collect_candidates';
import { MESSAGE_FIELD } from './columns';
import type { CountProbeResult, EsqlSearchScope } from './run_queries';
import { runCountProbe } from './run_queries';

function toRerankInput(pattern: LogPattern): string {
  const sampleMessage =
    typeof pattern.sample?.[MESSAGE_FIELD] === 'string'
      ? String(pattern.sample[MESSAGE_FIELD])
      : '';
  const full = sampleMessage ? `${pattern.pattern} ${sampleMessage}` : pattern.pattern;
  return full.length > MAX_RERANK_INPUT_LENGTH ? full.slice(0, MAX_RERANK_INPUT_LENGTH) : full;
}

/** Searches for log patterns matching a natural-language query using CATEGORIZE + inference RERANK. */
export async function searchWithEsqlRerank(
  params: SemanticLogSearchParams,
  logger: Logger
): Promise<SemanticLogSearchResult> {
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

  // Step 2: CATEGORIZE with adaptive sampling, then rerank via the inference API.
  try {
    const candidates = await collectCandidates({ scope, total, esClient, abortSignal });

    if (candidates.length === 0) {
      return { status: 'success', patterns: [] };
    }

    const capped = selectRerankCandidates(candidates, DEFAULT_RANK_WINDOW);

    // Step 3: rerank over the full candidate set via the inference API.
    // RERANK runs outside ES|QL because the two passes produce separate result sets that
    // ES|QL cannot union in a single statement.
    const rerankResponse = await esClient.inference.rerank(
      {
        inference_id: RERANK_ENDPOINT,
        query: nlQuery,
        input: capped.map(toRerankInput),
        top_n: maxPatterns,
        // We never read the echoed text; suppress it to avoid transferring the full input back.
        return_documents: false,
      },
      { signal: abortSignal, requestTimeout: ESQL_REQUEST_TIMEOUT_MS }
    );

    // TODO: derive a "nothing relevant matched" signal from the top relevance_score and surface it
    // as a tool warning. Needs a calibrated threshold; measure with the eval suite before shipping.
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
    return toFailureResult(error, { logger, target, phase: SEARCH_PHASE.SEARCH });
  }
}
