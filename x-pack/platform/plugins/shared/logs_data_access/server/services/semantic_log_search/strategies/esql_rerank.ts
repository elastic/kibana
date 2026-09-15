/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import type {
  LogPattern,
  SemanticLogSearchParams,
  SemanticLogSearchResult,
} from '../../../../common/services/semantic_log_search/types';
import { DEFAULT_MAX_PATTERNS, DEFAULT_RANK_WINDOW, ESQL_TIME_RANGE_FILTER } from '../constants';

/**
 * Row structure from the ES|QL CATEGORIZE + RERANK query.
 */
interface EsqlPatternRow {
  pattern: string;
  count: number;
  first_seen: string;
  last_seen: string;
  sample: string;
}

/**
 * Convert ES|QL columnar response to an array of typed objects.
 * This is the standard pattern used across Kibana (context_engine, entity_store, etc.).
 */
export function esqlRowsToObjects<T>(response: ESQLSearchResponse): T[] {
  const columns = response.columns ?? [];
  return (response.values ?? []).map((row) => {
    const record: Record<string, unknown> = {};
    row.forEach((value, index) => {
      const name = columns[index]?.name;
      if (name) {
        record[name] = value;
      }
    });
    return record as T;
  });
}

/**
 * Parse ES|QL response into LogPattern array.
 *
 * Expected columns from the ES|QL query:
 * - pattern: keyword (the categorized pattern)
 * - count: long
 * - first_seen: date
 * - last_seen: date
 * - sample: keyword (sample message)
 * - _score: double (rerank score, not mapped to LogPattern)
 *
 * Note: ES|QL CATEGORIZE does not provide _id/_index for the sample,
 * so sample only contains the message field.
 */
export function parseEsqlPatternResponse(
  response: ESQLSearchResponse,
  field: string = 'message'
): LogPattern[] {
  const rows = esqlRowsToObjects<EsqlPatternRow>(response);

  return rows
    .filter((row) => row.pattern != null && row.count != null)
    .map((row) => ({
      field,
      pattern: String(row.pattern),
      count: Number(row.count),
      firstSeen: row.first_seen ? new Date(row.first_seen).toISOString() : new Date().toISOString(),
      lastSeen: row.last_seen ? new Date(row.last_seen).toISOString() : new Date().toISOString(),
      // ES|QL CATEGORIZE doesn't provide _id/_index, only the sample message
      sample: {
        message: row.sample ? String(row.sample) : '',
      },
    }));
}

/**
 * Execute semantic search using ES|QL RERANK + CATEGORIZE.
 *
 * This is the fallback path when no semantic_text field is available but
 * the cluster has the RERANK inference endpoint configured.
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

  // CATEGORIZE, keep the most prevalent patterns, then RERANK by semantic relevance.
  query = query
    .pipe(
      'STATS count = COUNT(*), first_seen = MIN(@timestamp), last_seen = MAX(@timestamp), sample = SAMPLE(message, 1) BY pattern = CATEGORIZE(message)'
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

    return {
      patterns: parseEsqlPatternResponse(response as ESQLSearchResponse, 'message'),
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
