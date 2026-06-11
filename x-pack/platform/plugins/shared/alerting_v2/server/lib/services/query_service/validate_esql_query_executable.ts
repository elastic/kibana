/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AsyncRecordBatchStreamReader } from 'apache-arrow/Arrow.node';

export function appendEsqlLimitZero(query: string): string {
  return `${query.trimEnd()} | LIMIT 0`;
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
  query: string
): Promise<void> {
  const validationQuery = appendEsqlLimitZero(query);
  let reader: AsyncRecordBatchStreamReader | undefined;

  try {
    reader = await esClient.helpers
      .esql(
        {
          query: validationQuery,
          drop_null_columns: false,
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
