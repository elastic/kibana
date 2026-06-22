/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AsyncRecordBatchStreamReader } from 'apache-arrow/Arrow.node';

export interface ValidateEsqlQueryExecutableOptions {
  filter?: EsqlQueryRequest['filter'];
  params?: EsqlQueryRequest['params'];
}

export const ESQL_ARROW_EXECUTION_ERROR_PREFIX =
  'ES|QL query cannot be executed using the Arrow format required for rule evaluation';

export function appendEsqlLimitZero(query: string): string {
  return `${query.trimEnd()} | LIMIT 0`;
}

export function formatEsqlArrowExecutionErrorMessage(esErrorMessage: string): string {
  return `${ESQL_ARROW_EXECUTION_ERROR_PREFIX}: ${esErrorMessage}`;
}

/**
 * Validates that an ES|QL query can execute with the same Arrow response path
 * used by the rule executor (Arrow streaming via `helpers.esql().toArrowReader()`).
 *
 * Appends `| LIMIT 0` so semantic errors (unknown index, unsupported output
 * types for Arrow, etc.) are surfaced without returning rows.
 */
export async function validateEsqlQueryExecutable(
  esClient: ElasticsearchClient,
  query: string,
  { filter, params }: ValidateEsqlQueryExecutableOptions = {}
): Promise<void> {
  const validationQuery = appendEsqlLimitZero(query);
  let reader: AsyncRecordBatchStreamReader | undefined;

  try {
    reader = await esClient.helpers
      .esql(
        {
          query: validationQuery,
          drop_null_columns: false,
          filter,
          params,
        },
        {}
      )
      .toArrowReader();

    for await (const _batch of reader) {
      // LIMIT 0 yields no rows; iteration validates Arrow serialization.
    }
  } finally {
    if (reader && !reader.closed) {
      await reader.cancel().catch(() => {});
    }
  }
}
