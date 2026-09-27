/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type {
  LogPattern,
  SemanticLogSearchParams,
} from '../../../../../common/services/semantic_log_search/types';
import {
  CATEGORIZE_SIMILARITY_THRESHOLD,
  ESQL_REQUEST_TIMEOUT_MS,
  ESQL_TIME_RANGE_FILTER,
  PROBE_TIMEOUT_MS,
} from '../../constants';
import { MESSAGE_FIELD, PROBE_TOTAL_COLUMN } from './columns';
import { parseEsqlPatternResponse } from './parse_response';

/** Time range + target + optional KQL scope, built once and threaded through all query helpers. */
export interface EsqlSearchScope {
  target: string;
  startIso: string;
  endIso: string;
  kqlFilter?: string;
}

/** Result of the cheap pre-categorization count probe. `incomplete` means partial results. */
export type CountProbeResult = { status: 'counted'; total: number } | { status: 'incomplete' };

// ES|QL's implicit row cap; explicit so the ASC-sort truncation invariant is not load-bearing on the default.
const MAX_CATEGORIZE_ROWS = 1000;

// Build FROM <target> | WHERE <time range> [| WHERE KQL(<filter>)].
function buildBaseQuery(scope: EsqlSearchScope) {
  let query = esql.from(scope.target).where(ESQL_TIME_RANGE_FILTER);
  if (scope.kqlFilter) {
    query = query.where`KQL(${esql.str(scope.kqlFilter)})`;
  }
  return query;
}

// Shared ES|QL request envelope: named time-range params, partial results disabled.
function makeEsqlRequest(queryString: string, scope: EsqlSearchScope): EsqlQueryRequest {
  return {
    query: queryString,
    params: [{ _tstart: scope.startIso }, { _tend: scope.endIso }],
    allow_partial_results: false,
  };
}

/** Build the ES|QL string for the pre-categorization count probe. */
export function buildCountQuery(scope: EsqlSearchScope): string {
  return buildBaseQuery(scope).pipe(`STATS ${PROBE_TOTAL_COLUMN} = COUNT(*)`).print('basic');
}

/**
 * Build one CATEGORIZE pass query string.
 * Exclusion predicates sit before `SAMPLE` and `STATS` so they execute on the indexed field.
 * https://github.com/elastic/kibana/blob/d660eae7883a/x-pack/platform/packages/shared/kbn-ai-tools/src/utils/esql_categorize.ts#L65
 */
export function buildCategorizeQuery({
  scope,
  exclusionPatterns,
  samplingProbability,
  noiseThreshold,
  sortOrder,
}: {
  scope: EsqlSearchScope;
  exclusionPatterns: string[];
  samplingProbability: number;
  noiseThreshold: number;
  sortOrder: 'ASC' | 'DESC';
}): string {
  let query = buildBaseQuery(scope);

  for (const tokens of exclusionPatterns) {
    // Empty token strings match everything; filtering them prevents unintended row exclusion.
    if (tokens.length > 0) {
      query = query.where`NOT MATCH(${esql.col(MESSAGE_FIELD)}, ${esql.str(
        tokens
      )}, {"operator": "AND"})`;
    }
  }

  if (samplingProbability < 1) {
    query = query.pipe`SAMPLE ${esql.num(samplingProbability)}`;
  }

  // LATEST returns the most-recent value without the ::keyword cast that TOP requires.
  const statsClause = `STATS count = COUNT(*), first_seen = MIN(@timestamp), last_seen = MAX(@timestamp), sample = LATEST(${MESSAGE_FIELD}) BY pattern = CATEGORIZE(${MESSAGE_FIELD}, {"output_format": "tokens", "similarity_threshold": ${CATEGORIZE_SIMILARITY_THRESHOLD}})`;
  let stats = query.pipe(statsClause);

  if (noiseThreshold > 0) {
    stats = stats.where`count > ${esql.num(noiseThreshold)}`;
  }

  return stats.sort(['count', sortOrder]).limit(MAX_CATEGORIZE_ROWS).print('basic');
}

/**
 * Run the cheap pre-categorization count probe with a short timeout.
 *
 * Uses `STATS COUNT(*)` rather than `esClient.count` — `_count` cannot resolve ES|QL views.
 * The short timeout (`PROBE_TIMEOUT_MS`) lets the orchestrator decline gracefully when the scope
 * is too broad to categorize within the full budget.
 */
export async function runCountProbe({
  scope,
  esClient,
  abortSignal,
}: {
  scope: EsqlSearchScope;
  esClient: SemanticLogSearchParams['esClient'];
  abortSignal: AbortSignal | undefined;
}): Promise<CountProbeResult> {
  const response = await esClient.esql.query(makeEsqlRequest(buildCountQuery(scope), scope), {
    signal: abortSignal,
    requestTimeout: PROBE_TIMEOUT_MS,
  });

  if (response.is_partial) {
    return { status: 'incomplete' };
  }

  const esqlResponse = response as ESQLSearchResponse;
  const columns = esqlResponse.columns ?? [];
  const totalIndex = columns.findIndex(({ name }) => name === PROBE_TOTAL_COLUMN);
  const firstRow = esqlResponse.values?.[0];
  const raw = firstRow && totalIndex !== -1 ? firstRow[totalIndex] : undefined;

  return { status: 'counted', total: typeof raw === 'number' ? raw : 0 };
}

/**
 * Run one CATEGORIZE pass and return parsed patterns.
 * Throws when the response is partial — the caller surfaces this as an execution error rather
 * than silently returning an empty result.
 */
export async function runCategorizePass({
  scope,
  exclusionPatterns,
  samplingProbability,
  noiseThreshold,
  sortOrder,
  esClient,
  abortSignal,
}: {
  scope: EsqlSearchScope;
  exclusionPatterns: string[];
  samplingProbability: number;
  noiseThreshold: number;
  sortOrder: 'ASC' | 'DESC';
  esClient: SemanticLogSearchParams['esClient'];
  abortSignal: AbortSignal | undefined;
}): Promise<LogPattern[]> {
  const queryString = buildCategorizeQuery({
    scope,
    exclusionPatterns,
    samplingProbability,
    noiseThreshold,
    sortOrder,
  });

  const response = await esClient.esql.query(makeEsqlRequest(queryString, scope), {
    signal: abortSignal,
    requestTimeout: ESQL_REQUEST_TIMEOUT_MS,
  });

  if (response.is_partial) {
    throw new Error('categorize pass returned partial results');
  }

  return parseEsqlPatternResponse(response as ESQLSearchResponse, MESSAGE_FIELD);
}
