/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';

const executeEsqlToolSchema = z.object({
  query: z.string().describe('The ES|QL query to execute'),
});

export interface ExecuteEsqlResponse {
  columns: EsqlEsqlColumnInfo[];
  values: FieldValue[][];
}

export const executeEsqlTool = (): RegisteredTool<
  typeof executeEsqlToolSchema,
  ExecuteEsqlResponse
> => {
  return {
    id: OnechatToolIds.executeEsql,
    description: 'Execute an ES|QL query and return the results.',
    schema: executeEsqlToolSchema,
    handler: async ({ query }, { esClient }) => {
      return executeEsql({ query, esClient: esClient.asCurrentUser });
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const executeEsql = async ({
  query,
  esClient,
}: {
  query: string;
  esClient: ElasticsearchClient;
}): Promise<ExecuteEsqlResponse> => {
  const response = await esClient.esql.query({ query, drop_null_columns: true });
  return {
    columns: response.columns,
    values: response.values,
  };
};
