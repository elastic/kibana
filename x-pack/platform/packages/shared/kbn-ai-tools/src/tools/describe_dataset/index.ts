/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { dateRangeQuery } from '@kbn/es-query';
import { getEsqlColumnSchema } from '../../utils/get_esql_column_schema';
import { getSampleDocumentsEsql } from './get_sample_documents';
import { mergeSampleDocumentsWithSchema } from './merge_sample_documents_with_schema';

export async function describeDataset({
  esClient,
  start,
  end,
  index,
  kql,
}: {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  index: string | string[];
  kql?: string;
}) {
  const [columns, sampleDocs, total] = await Promise.all([
    getEsqlColumnSchema({ esClient, index, start, end }),
    getSampleDocumentsEsql({
      esClient,
      index,
      start,
      end,
      kql,
    }),
    runEsqlPopulationCount({ esClient, index, start, end, kql }),
  ]);

  const schema = columns.map((column) => {
    return {
      name: column.name,
      types: column.originalTypes ?? [column.type],
    };
  });

  const analysis = mergeSampleDocumentsWithSchema({
    hits: sampleDocs.hits,
    total,
    schema,
  });

  return analysis;
}

async function runEsqlPopulationCount({
  esClient,
  index,
  start,
  end,
  kql,
}: {
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  kql?: string;
}): Promise<number> {
  const indices = Array.isArray(index) ? index : [index];
  let query = esql.from(indices);

  if (kql) {
    query = query.where`KQL(${esql.str(kql)})`;
  }

  const response = (await esClient.esql.query({
    query: query.pipe`STATS total = COUNT(*)`.print('basic'),
    filter: { bool: { filter: dateRangeQuery(start, end) } },
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;
  const total = response.values[0]?.[0];

  return typeof total === 'number' ? total : 0;
}
