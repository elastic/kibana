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
import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import type { ToolEventEmitter } from '@kbn/onechat-server';
import type { EsqlResponse } from '../utils/esql';
import { createNlToEsqlGraph } from './graph';

export interface GenerateEsqlResponse {
  /**
   * The full text answer which was provided by the LLM when generating the query.
   */
  answer: string;
  /**
   * The ES|QL query which was extracted from the answer.
   */
  query: string;
  /**
   * Results from executing the query.
   * Available if `executeQuery` was true and if a successful query was executed.
   */
  results?: EsqlResponse;
  /**
   * Error message if the query could not be executed
   */
  error?: string;
}

export const generateEsql = async ({
  nlQuery,
  index,
  executeQuery,
  additionalInstructions,
  maxRetries = 3,
  model,
  esClient,
  logger,
  events,
}: {
  nlQuery: string;
  executeQuery: boolean;
  maxRetries?: number;
  index: string;
  additionalInstructions?: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  events: ToolEventEmitter;
}): Promise<GenerateEsqlResponse> => {
  const docBase = await EsqlDocumentBase.load();

  const toolGraph = createNlToEsqlGraph({ model, esClient, logger, docBase, events });

  return withActiveInferenceSpan(
    'NaturalLanguageToEsqlGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      const outState = await toolGraph.invoke(
        { nlQuery, target: index, executeQuery, maxRetries, additionalInstructions },
        { tags: ['search_tool'], metadata: { graphName: 'search_tool' } }
      );

      return {
        error: outState.error,
        answer: outState.answer,
        query: outState.query,
        results: outState.results,
      };
    }
  );
};
