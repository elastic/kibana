/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EsqlEsqlColumnInfo,
  FieldValue,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isMaximumResponseSizeExceededError, isRequestAbortedError } from '@kbn/es-errors';
import { MAX_ES_RESPONSE_SIZE_BYTES } from '../../constants';
import { applyFrozenTierExclusion } from '../data_tiers';
import { applyLimit } from './apply_limit';

export interface EsqlResponse {
  columns: EsqlEsqlColumnInfo[];
  values: FieldValue[][];
}

const buildTimeoutMessage = (timeoutMs: number | undefined): string => {
  const waited = timeoutMs !== undefined ? ` after ${Math.ceil(timeoutMs / 1000)}s` : '';
  return (
    `Stopped waiting for the ES|QL query${waited}. ` +
    `Do not re-run it or a near variant; narrow the time range or use a more selective filter.`
  );
};

const isTimeoutError = (err: unknown): boolean =>
  err instanceof Error && err.name === 'TimeoutError';

/**
 * Execute an ES|QL query and returns the response.
 * Cross-cluster search (CCS) is supported: queries may target remote indices (e.g. FROM remote:index).
 * allow_partial_results is enabled so that if a remote cluster is unavailable during a CCS query,
 * partial results from the available clusters are returned instead of failing the entire request.
 *
 * When `limit` is provided, the query is rewritten so the ES|QL engine enforces the cap. If the
 * query already ends with a `LIMIT N`, the trailing limit becomes `min(N, limit)`; otherwise a
 * new `| LIMIT <limit>` pipe is appended. See `applyLimit` for full semantics.
 *
 * `filter` is a Query DSL container that only ever narrows the result set. It is not a `WHERE`
 * clause and cannot reference `?named` params, because Elasticsearch parses it separately from the
 * query text.
 *
 * `dropNullColumns` maps to Elasticsearch `drop_null_columns` (default `true`).
 *
 * `timeoutMs` sets a wall-clock deadline for this call through an abort signal, with retries
 * disabled. It can only shorten the wait: the deployment's request timeout still applies. When
 * `timeoutMs` is set, a deadline hit or a client `TimeoutError` is rethrown as a plain error that
 * tells the agent not to re-run the query unchanged; without it, errors are rethrown unchanged.
 */
export const executeEsql = async ({
  query,
  params,
  limit,
  filter,
  dropNullColumns = true,
  includeFrozen = false,
  timeoutMs,
  esClient,
}: {
  query: string;
  params?: Array<Record<string, FieldValue>>;
  limit?: number;
  filter?: QueryDslQueryContainer;
  dropNullColumns?: boolean;
  includeFrozen?: boolean;
  timeoutMs?: number;
  esClient: ElasticsearchClient;
}): Promise<EsqlResponse> => {
  const effectiveQuery = limit !== undefined ? applyLimit(query, limit) : query;
  const effectiveFilter = applyFrozenTierExclusion(filter, includeFrozen);
  const timeoutSignal = timeoutMs !== undefined ? AbortSignal.timeout(timeoutMs) : undefined;

  try {
    const response = await esClient.esql.query(
      {
        query: effectiveQuery,
        drop_null_columns: dropNullColumns,
        allow_partial_results: true,
        ...(params && params.length > 0 ? { params: params as unknown as FieldValue[] } : {}),
        ...(effectiveFilter ? { filter: effectiveFilter } : {}),
      },
      {
        maxResponseSize: MAX_ES_RESPONSE_SIZE_BYTES,
        ...(timeoutSignal ? { maxRetries: 0, signal: timeoutSignal } : {}),
      }
    );
    return {
      columns: response.columns,
      values: response.values,
    };
  } catch (err) {
    if (isMaximumResponseSizeExceededError(err)) {
      throw new Error(
        `ES|QL query response exceeded the maximum allowed size of 20MB. ` +
          `Try narrowing your query with tighter filters, a LIMIT clause, or fewer fields.`
      );
    }
    if (timeoutSignal) {
      const deadlineHit = timeoutSignal.aborted && isRequestAbortedError(err);
      if (deadlineHit || isTimeoutError(err)) {
        throw new Error(buildTimeoutMessage(deadlineHit ? timeoutMs : undefined));
      }
    }
    throw err;
  }
};
