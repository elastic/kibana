/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { buildEsqlParams, executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ResolveEsqlControlColumnType } from '@kbn/dashboard-agent-authoring';

/**
 * Runs the query of a query-based ES|QL control without rows, to read the type of the column it
 * returns. Injected like the other resolvers so dashboard authoring stays free of Elasticsearch access.
 */
export const createEsqlControlColumnTypeResolver = ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): ResolveEsqlControlColumnType => {
  return async ({ query, esqlVariables, timeRange }) => {
    const { columns } = await executeEsql({
      query,
      params: buildEsqlParams({ query, timeRange, esqlVariables }),
      limit: 0,
      dropNullColumns: false,
      esClient,
    });
    return columns.length === 1 ? columns[0].type : undefined;
  };
};
