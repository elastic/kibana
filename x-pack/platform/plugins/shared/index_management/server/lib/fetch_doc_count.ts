/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export const fetchDocCount = async (
  client: ElasticsearchClient,
  indexNames: string[]
): Promise<Record<string, number>> => {
  const result = await client.esql.query({
    query: `FROM ${indexNames.join(',')} METADATA _index | STATS count() BY _index`,
  });

  const indexNameIndex = result.columns.findIndex((col) => col.name === '_index');
  const countIndex = result.columns.findIndex((col) => col.name === 'count()');

  const values = (result.values || []).reduce((col, vals) => {
    col[vals[indexNameIndex] as string] = vals[countIndex] as number;
    return col;
  }, {} as Record<string, number>);

  // add zeros back in since they won't be present in the results
  indexNames.forEach((indexName) => {
    if (!(indexName in values)) {
      values[indexName] = 0;
    }
  });

  return values;
};
