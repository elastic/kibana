/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import type { ESQLRow, ESQLSearchResponse } from '@kbn/es-types';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import type {
  LogPattern,
  SemanticLogSearchParams,
  SemanticLogSearchResult,
} from '../../../../common/services/semantic_log_search/types';
import {
  CATEGORIZE_SIMILARITY_THRESHOLD,
  DEFAULT_MAX_PATTERNS,
  DEFAULT_RANK_WINDOW,
  ESQL_TIME_RANGE_FILTER,
} from '../constants';

/**
 * ES|QL responds columnar: `columns` holds the names, each row holds the values positionally.
 * This resolves the name-to-position lookup once so rows can be read by column name, and
 * returns `undefined` for columns the response does not carry.
 */
const createCellReader = (response: ESQLSearchResponse) => {
  const positions = new Map((response.columns ?? []).map(({ name }, position) => [name, position]));

  return (row: ESQLRow, column: string): unknown => {
    const position = positions.get(column);
    return position === undefined ? undefined : row[position];
  };
};

/** Timestamps arrive as ISO strings or epoch millis; fall back to now when absent. */
const toIsoString = (value: unknown): string =>
  value ? new Date(value as string | number).toISOString() : new Date().toISOString();

/**
 * Parse ES|QL response into LogPattern array.
 *
 * Expected columns from the ES|QL query:
 * - pattern: keyword (the categorized pattern)
 * - count: long
 * - first_seen: date
 * - last_seen: date
 * - sample: keyword (sample message)
 * - _score: double (rerank score, mapped to relevanceScore)
 *
 * Note: ES|QL CATEGORIZE does not provide _id/_index for the sample,
 * so sample only contains the message field.
 */
export function parseEsqlPatternResponse(
  response: ESQLSearchResponse,
  field: string = 'message'
): LogPattern[] {
  const cell = createCellReader(response);

  // One pass over the rows: returning an empty array skips a row, returning an object keeps it.
  return (response.values ?? []).flatMap((row) => {
    const pattern = cell(row, 'pattern');
    const count = cell(row, 'count');

    if (pattern == null || count == null) {
      return [];
    }

    const sample = cell(row, 'sample');
    const score = cell(row, '_score');

    return {
      field,
      pattern: String(pattern),
      count: Number(count),
      firstSeen: toIsoString(cell(row, 'first_seen')),
      lastSeen: toIsoString(cell(row, 'last_seen')),
      // ES|QL CATEGORIZE doesn't provide _id/_index, only the sample message
      sample: {
        message: sample ? String(sample) : '',
      },
      ...(typeof score === 'number' ? { relevanceScore: score } : {}),
    };
  });
}

/**
 * Execute semantic search using ES|QL RERANK + CATEGORIZE.
 *
 * This is the implemented search path. The pre-indexed rungs
 * (semantic_text / pattern_text) are stubbed.
 *
 * Flow:
 * 1. CATEGORIZE extracts patterns from log messages
 * 2. Sort by count and limit to rank window (focus on prevalent patterns)
 * 3. RERANK scores patterns by semantic relevance to the query using both pattern and sample
 */
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
  } = params;

  const startIso = new Date(timeRange.start).toISOString();
  const endIso = new Date(timeRange.end).toISOString();

  let query = esql.from(target).where(ESQL_TIME_RANGE_FILTER);

  if (kqlFilter) {
    query = query.where`KQL(${esql.str(kqlFilter)})`;
  }

  // Query flow:
  // 1. CATEGORIZE groups messages into patterns. output_format: "tokens" produces clean text
  //    instead of regex. similarity_threshold is the single tuning point for pattern granularity.
  //
  // 2. Aggregate per pattern: count, time bounds, and a deterministic sample (LATEST, not SAMPLE,
  //    so identical queries produce identical rankings).
  //
  // 3. Sort by count DESC and keep the top N (the rank window). RERANK is an inference call per
  //    candidate, so not all patterns can reach it. Prevalence is orthogonal to relevance
  //    (a routine health check beats a rare error), but lexical scoring regresses paraphrase
  //    queries (a score on "db errors" gives zero to `postgres: FATAL connection limit exceeded`).
  //    The real fix is embeddings at selection time (semantic_text).
  //
  // 4. RERANK scores the windowed patterns by semantic relevance. It operates on both pattern
  //    (the template) and sample (a concrete message): the template loses specifics, the sample
  //    preserves them.
  query = query
    .pipe(
      `STATS count = COUNT(*), first_seen = MIN(@timestamp), last_seen = MAX(@timestamp), sample = LATEST(message) BY pattern = CATEGORIZE(message, {"output_format": "tokens", "similarity_threshold": ${CATEGORIZE_SIMILARITY_THRESHOLD}})`
    )
    .sort(['count', 'DESC'])
    .limit(DEFAULT_RANK_WINDOW).pipe`RERANK ${esql.str(nlQuery)} ON pattern, sample`
    .sort(['_score', 'DESC'])
    .limit(maxPatterns);

  // Bind the reserved time-range params here rather than through the composer's
  // params bag, whose entries are typed too loosely for the Elasticsearch client.
  const request: EsqlQueryRequest = {
    query: query.print('basic'),
    params: [{ _tstart: startIso }, { _tend: endIso }],
  };

  try {
    const response = await esClient.esql.query(request);
    const patterns = parseEsqlPatternResponse(response as ESQLSearchResponse, 'message');

    // TODO: derive a "nothing relevant matched" signal from the top _score and surface it as a
    // tool warning. Needs a calibrated floor first: observed +3.46 when the right pattern
    // reached the window, -5.65 and -6.12 when it did not, on `.rerank-v1-elasticsearch`.
    // Three data points is not a threshold; measure with the eval suite first.

    return {
      patterns,
      strategy: 'esql_rerank',
    };
  } catch (error) {
    // Handle missing index gracefully (lazy initialization before first write)
    if (isEsqlUnknownIndexError(error)) {
      logger.debug(`ES|QL RERANK: index not found for target "${target}"`);
      return { patterns: [], unavailable: true };
    }
    // Log other errors (license, ES version, RERANK/CATEGORIZE failures)
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`ES|QL RERANK query failed for target "${target}": ${errorMessage}`);
    return { patterns: [], unavailable: true };
  }
}
