/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { buildServerESQLCallbacks } from '@kbn/esql-server-utils';
import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import type { EsqlResponse } from '../utils/esql';
import { createNlToEsqlGraph } from './graph';
import { indexExplorer } from '../index_explorer';

/**
 * Wraps the editor's current buffer as additional context for {@link generateEsql} when
 * the user asks for a full query while content already exists in the editor.
 * Used by the non-surgical path of the editor's NL-to-ES|QL route.
 */
export const buildNlToEsqlAdditionalContext = (currentQuery: string): string => {
  if (currentQuery) {
    return [
      'The user is in the ES|QL editor. Below is their current query.',
      'If the request is about changing, extending, or fixing that query, treat it as the starting point.',
      'If the request is for a new or unrelated query, you may produce a full replacement.',
      '',
      '<current_query>',
      currentQuery,
      '</current_query>',
    ].join('\n');
  }
  return '';
};

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
  events?: ToolEventEmitter;
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
   * Maximum number of retries if the query fails (execute or AST validation).
   * When `executeQuery` is true: retries after execution errors; when false: retries after AST validation errors.
   * Defaults to `3`
   * */
  maxRetries?: number;
  /**
   * Maximum row limit to use in generated ES|QL queries.
   */
  rowLimit?: number;
  /**
   * Time range used to supply named parameters (?_tstart, ?_tend)
   * when executing the generated query for validation.
   * Defaults to last 24 hours if not provided.
   */
  timeRange?: TimeRange;
  /**
   * If true, omits the instruction to use named parameters (?_tstart, ?_tend)
   * for time range filtering in generated queries.
   */
  disableNamedParams?: boolean;
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
  timeRange: inputTimeRange,
  disableNamedParams,
  model,
  esClient,
  logger,
}: GenerateEsqlParams): Promise<GenerateEsqlResponse> => {
  const timeRange = inputTimeRange ?? { from: 'now-24h', to: 'now' };
  const docBase = await EsqlDocumentBase.load();
  const esqlCallbacks = buildServerESQLCallbacks({ client: esClient });

  const graph = createNlToEsqlGraph({
    model,
    esClient,
    docBase,
    esqlCallbacks,
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
        // Discover index if not provided (`indexExplorer` takes one string; append `additionalContext`
        // when set so resource selection can use editor notes or any other hints, not only `nlQuery`.)
        const nlQueryWithContext = additionalContext?.trim()
          ? `${nlQuery.trim()}\n\n${additionalContext.trim()}`
          : nlQuery.trim();

        let selectedTarget = index;
        if (!selectedTarget) {
          logger?.debug('No index provided, discovering target index using indexExplorer');
          const {
            resources: [selectedResource],
          } = await indexExplorer({
            nlQuery: nlQueryWithContext,
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
            disableNamedParams,
            timeRange,
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
