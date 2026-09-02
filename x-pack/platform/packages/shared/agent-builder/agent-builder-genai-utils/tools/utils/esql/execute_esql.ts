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
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import { MAX_ES_RESPONSE_SIZE_BYTES } from '../../constants';
import { applyLimit } from './apply_limit';

export interface EsqlResponse {
  columns: EsqlEsqlColumnInfo[];
  values: FieldValue[][];
}

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
 */
export const executeEsql = async ({
  query,
  params,
  limit,
  filter,
  dropNullColumns = true,
  esClient,
}: {
  query: string;
  params?: Array<Record<string, FieldValue>>;
  limit?: number;
  filter?: QueryDslQueryContainer;
  dropNullColumns?: boolean;
  esClient: ElasticsearchClient;
}): Promise<EsqlResponse> => {
  const effectiveQuery = limit !== undefined ? applyLimit(query, limit) : query;

  try {
    const response = await esClient.esql.query(
      {
        query: effectiveQuery,
        drop_null_columns: dropNullColumns,
        allow_partial_results: true,
        ...(params && params.length > 0 ? { params: params as unknown as FieldValue[] } : {}),
        ...(filter ? { filter } : {}),
      },
      { maxResponseSize: MAX_ES_RESPONSE_SIZE_BYTES }
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
    throw err;
  }
};
