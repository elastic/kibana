/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ToolCall } from '@kbn/inference-common';
import { RunQueryOutput, createQueryCallback } from './create_query_callback';

type RunQueriesToolCall = ToolCall<string, { queries: string[] }>;

export interface RunQueriesToolCallResponse {
  responses: RunQueryOutput[];
}

export function createRunQueriesToolCallback({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): (toolCall: RunQueriesToolCall) => Promise<RunQueriesToolCallResponse> {
  const queryCallback = createQueryCallback({ esClient });

  return async (toolCall: ToolCall<string, { queries: string[] }>) => {
    return {
      responses: await Promise.all(
        toolCall.function.arguments.queries.map(async (query) => {
          const response = await queryCallback(query);

          return response;
        })
      ),
    };
  };
}
