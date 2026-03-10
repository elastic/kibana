/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ToolEventEmitter, ToolHandlerResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools';
import { createSearchToolGraph } from './graph';

export const runSearchTool = async ({
  nlQuery,
  index,
  rowLimit,
  customInstructions,
  model,
  esClient,
  logger,
  events,
}: {
  nlQuery: string;
  index?: string;
  rowLimit?: number;
  customInstructions?: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  events: ToolEventEmitter;
}): Promise<ToolHandlerResult[]> => {
  const toolGraph = createSearchToolGraph({
    model,
    esClient,
    logger,
    events,
  });

  return withActiveInferenceSpan(
    'SearchToolGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const outState = await toolGraph.invoke(
        {
          nlQuery,
          targetPattern: index,
          rowLimit,
          customInstructions,
        },
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
