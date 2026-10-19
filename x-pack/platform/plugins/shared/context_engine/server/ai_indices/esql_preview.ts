/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { applyLimit } from './apply_limit';

export interface EsqlPreview {
  row_count: number;
  sample_rows: Array<Record<string, unknown>>;
}

const zipRows = (
  columns: Array<{ name: string }>,
  values: unknown[][]
): Array<Record<string, unknown>> =>
  values.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column.name, row[index]]))
  );

/** Row count and a capped sample of a query's results, for grounding a model without running it itself. */
export const previewEsqlQuery = async (
  esClient: ElasticsearchClient,
  query: string,
  sampleSize: number
): Promise<EsqlPreview> => {
  const [countResponse, sampleResponse] = await Promise.all([
    esClient.esql.query({ query: `${query.trimEnd()}\n| STATS row_count = COUNT(*)` }),
    esClient.esql.query({ query: applyLimit(query, sampleSize) }),
  ]);

  const rowCount = countResponse.values[0]?.[0];
  return {
    row_count: typeof rowCount === 'number' ? rowCount : 0,
    sample_rows: zipRows(sampleResponse.columns, sampleResponse.values),
  };
};

/** Row count alone, for a query whose documents are not needed — only how many there are. */
export const countEsqlRows = async (
  esClient: ElasticsearchClient,
  query: string
): Promise<number> => {
  const response = await esClient.esql.query({
    query: `${query.trimEnd()}\n| STATS row_count = COUNT(*)`,
  });
  const rowCount = response.values[0]?.[0];
  return typeof rowCount === 'number' ? rowCount : 0;
};
