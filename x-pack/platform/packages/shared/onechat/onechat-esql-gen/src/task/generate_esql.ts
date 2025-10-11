/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { createGenerateEsqlGraph } from './graph';

export const generateEsql = ({
  targetIndex,
  nlQuery,
  chatModel,
  esClient,
  logger,
}: {
  nlQuery: string;
  targetIndex?: string;
  chatModel: InferenceChatModel;
  esClient: ElasticsearchClient;
  logger: Logger;
}) => {
  return withActiveInferenceSpan(
    'GenerateEsql',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const graph = createGenerateEsqlGraph({
        chatModel,
        esClient,
        logger,
      });

      const endState = await graph.invoke({
        nlQuery: '',
      });

      return endState.nlQuery;
    }
  );
};
