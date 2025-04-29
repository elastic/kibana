/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';

interface EsqlResultColumn {
  name: string;
  type: 'date' | 'keyword';
}

type EsqlRowValue = string | number | boolean | null | Record<string, unknown>;
type EsqlResultRow = EsqlRowValue[];

interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
}

type Response = Array<{
  _id: string;
  _source: Record<string, unknown>;
}>;

export const executeEsqlRequest = async ({
  esClient,
  requestBody,
}: {
  esClient: ElasticsearchClient;
  requestBody: Record<string, unknown>;
}): Promise<Response> => {
  const response = await esClient.transport.request<EsqlTable>({
    method: 'POST',
    path: '/_query',
    body: requestBody,
    querystring: { drop_null_columns: true },
  });

  const [sourceIndex, idIndex] = [
    response.columns.findIndex((col) => col.name === '_source'),
    response.columns.findIndex((col) => col.name === '_id'),
  ];

  if (sourceIndex === -1 || idIndex === -1) {
    throw new Error('Invalid ES|QL response format: missing _source or _id column');
  }

  const results = response.values
    .map((row) => ({
      _id: row[idIndex],
      _source: row[sourceIndex],
    }))
    .filter(
      (row) =>
        row._id !== null &&
        typeof row._id === 'string' &&
        row._source !== null &&
        typeof row._source === 'object'
    ) as Response;

  return results;
};
