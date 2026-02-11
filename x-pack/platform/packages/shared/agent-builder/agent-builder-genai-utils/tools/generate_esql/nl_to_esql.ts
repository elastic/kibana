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
import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { EsqlResponse } from '../utils/esql';
import { createNlToEsqlGraph } from './graph';
import { indexExplorer } from '../index_explorer';

export interface GenerateEsqlResponse {
  /**
   * The ES|QL query which was generated
   */
  query: string;
  /**
   * The full text answer which was provided by the LLM when generating the query.
   */
  answer: string;
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

export interface GenerateEsqlDeps {
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  events: ToolEventEmitter;
}

export interface GenerateEsqlOptions {
  /**
   * The natural language query to generate ES|QL from
   */
  nlQuery: string;
  /**
   * The resource (index/datastream/alias) to target
   */
  index?: string;
  /**
   * Additional context to provide to the model (user prompt)
   */
  additionalContext?: string;
  /**
   * Additional instructions to provide to the model (system prompt)
   */
  additionalInstructions?: string;
  /**
   * If true, will attempt to execute the query and will return the results.
   * Defaults to `true`
   */
  executeQuery?: boolean;
  /**
   * Maximum number of retries to attempt if the query fails to execute.
   * Note: this is only relevant if `executeQuery` is `true`
   * Defaults to `3`
   * */
  maxRetries?: number;
  /**
   * Maximum row limit to use in generated ES|QL queries.
   */
  rowLimit?: number;
}

export type GenerateEsqlParams = GenerateEsqlOptions & GenerateEsqlDeps;

export const generateEsql = async ({
  nlQuery,
  index,
  executeQuery = true,
  additionalInstructions,
  additionalContext,
  maxRetries = 3,
  rowLimit,
  model,
  esClient,
  logger,
  events,
}: GenerateEsqlParams): Promise<GenerateEsqlResponse> => {
  const docBase = await EsqlDocumentBase.load();

  const graph = createNlToEsqlGraph({
    model,
    esClient,
    logger,
    docBase,
    events,
  });

  return withActiveInferenceSpan(
    'GenerateEsqlGraph',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      try {
        // Discover index if not provided
        let selectedTarget = index;
        if (!selectedTarget) {
          logger?.debug('No index provided, discovering target index using indexExplorer');
          const {
            resources: [selectedResource],
          } = await indexExplorer({
            nlQuery,
            esClient,
            limit: 1,
            model,
            logger,
          });
          if (!selectedResource) {
            throw new Error(
              'Could not discover a suitable index for the query. Please specify an index explicitly.'
            );
          }
          selectedTarget = selectedResource.name;
          logger?.debug(`Discovered target index: ${selectedTarget}`);
        }

        const outState = await graph.invoke(
          {
            nlQuery,
            target: selectedTarget,
            executeQuery,
            maxRetries,
            additionalInstructions,
            additionalContext,
            rowLimit,
          },
          {
            recursionLimit: 25,
            tags: ['generate_esql'],
            metadata: { graphName: 'generate_esql' },
          }
        );

        return {
          error: outState.error,
          answer: outState.answer,
          query: outState.query,
          results: outState.results,
        };
      } catch (e) {
        throw new Error(`Could not generate ESQL query: ${e.message}`);
      }
    }
  );
};
