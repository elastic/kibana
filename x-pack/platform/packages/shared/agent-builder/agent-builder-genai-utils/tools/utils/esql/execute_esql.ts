/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export interface EsqlResponse {
  columns: EsqlEsqlColumnInfo[];
  values: FieldValue[][];
}

/**
 * Execute an ES|QL query and returns the response.
 */
export const executeEsql = async ({
  query,
  esClient,
}: {
  query: string;
  esClient: ElasticsearchClient;
}): Promise<EsqlResponse> => {
  const response = await esClient.esql.query({ query, drop_null_columns: true });
  return {
    columns: response.columns,
    values: response.values,
  };
};
