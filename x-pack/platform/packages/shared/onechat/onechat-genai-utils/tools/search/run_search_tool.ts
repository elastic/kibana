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
import type { ToolEventEmitter } from '@kbn/onechat-server';
import type { ToolResult } from '@kbn/onechat-common/tools';
import { ToolResultType } from '@kbn/onechat-common/tools';
import { createSearchToolGraph } from './graph';

export const runSearchTool = async ({
  nlQuery,
  index,
  model,
  esClient,
  logger,
  events,
  maxAttempts = 3,
}: {
  nlQuery: string;
  index?: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  events: ToolEventEmitter;
  maxAttempts?: number;
}): Promise<ToolResult[]> => {
  const toolGraph = createSearchToolGraph({ model, esClient, logger, events });

  return withActiveInferenceSpan(
    'SearchToolGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const outState = await toolGraph.invoke(
        { nlQuery, targetPattern: index, maxAttempts },
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

      const hasUseful = outState.results.some((r) => r.type !== ToolResultType.error);
      if (!hasUseful && outState.failureSummary) {
        return [
          {
            type: ToolResultType.error,
            data: { message: outState.failureSummary },
          },
        ];
      }

      return outState.results;
    }
  );
};
