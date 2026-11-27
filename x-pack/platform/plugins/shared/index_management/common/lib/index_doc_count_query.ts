/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { quoteEsqlIndexName } from './quote_esql_index_name';

const INDEX_COLUMN = '_index';
const COUNT_COLUMN = 'count()';

/**
 * Builds the ES|QL query that counts documents per index. ES|QL is used because the list of index
 * names can be too long for query DSL.
 */
export const buildIndexDocCountQuery = (indexNames: readonly string[]): string =>
  `FROM ${indexNames
    .map(quoteEsqlIndexName)
    .join(',')} METADATA ${INDEX_COLUMN} | STATS ${COUNT_COLUMN} BY ${INDEX_COLUMN}`;

/** Maps the doc count query result to counts per index, with 0 for indices without documents. */
export const toIndexDocCounts = (
  { columns, values }: Pick<EsqlQueryResponse, 'columns' | 'values'>,
  indexNames: readonly string[]
): Record<string, number> => {
  const indexColumn = columns.findIndex(({ name }) => name === INDEX_COLUMN);
  const countColumn = columns.findIndex(({ name }) => name === COUNT_COLUMN);
  const counts: Record<string, number> = {};
  for (const row of values ?? []) {
    const indexName = row[indexColumn];
    const count = row[countColumn];
    if (typeof indexName === 'string' && typeof count === 'number') {
      counts[indexName] = count;
    }
  }
  // indices without documents are absent from the results
  for (const indexName of indexNames) {
    counts[indexName] ??= 0;
  }
  return counts;
};
