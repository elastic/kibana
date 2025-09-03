/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { ScopedModel } from '@kbn/onechat-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ToolResult } from '@kbn/onechat-common/tools';
import { ToolResultType } from '@kbn/onechat-common/tools';
import { createSearchToolGraph } from './graph';

export const runSearchTool = async ({
  nlQuery,
  index,
  model,
  esClient,
  logger,
}: {
  nlQuery: string;
  index?: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<ToolResult[]> => {
  const toolGraph = createSearchToolGraph({ model, esClient, logger });

  return withActiveInferenceSpan(
    'SearchToolGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const outState = await toolGraph.invoke(
        { nlQuery, targetPattern: index },
        { tags: ['search_tool'], metadata: { graphName: 'search_tool' } }
      );

      if (outState.error) {
        return [
          {
            type: ToolResultType.error,
            data: { message: outState.error },
          },
        ];
      }

      return outState.results;
    }
  );
};
