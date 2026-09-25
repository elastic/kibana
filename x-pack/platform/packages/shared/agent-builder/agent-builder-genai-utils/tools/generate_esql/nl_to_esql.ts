/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { TimeRange } from '@kbn/agent-builder-common';
import { EffortLevels } from '@kbn/agent-builder-common';
import type { ModelProvider, ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { buildServerESQLCallbacks } from '@kbn/esql-server-utils';
import { DEFAULT_ESQL_TIME_RANGE, type EsqlResponse } from '../utils/esql';
import { createNlToEsqlGraph, requestDocumentationSchema } from './graph';
import type { RequestDocumentationAction } from './actions';
import { indexExplorer } from '../index_explorer';
import { loadDocumentation } from './documentation';
import { createRequestDocumentationPromptNoResource } from './prompts';

export class GenerateEsqlNoDataError extends Error {
  readonly code = 'NO_DATA' as const;
  constructor(message: string) {
    super(message);
    this.name = 'GenerateEsqlNoDataError';
  }
}

export interface GenerateEsqlResponse {
  /**
   * The ES|QL query which was generated.
   *
   * `undefined` when the model failed to produce a query after exhausting retries — in that
   * case {@link GenerateEsqlResponse.error} is always set. Consumers should check `error`
   * before using `query`.
   */
  query?: string;
  /**
   * The full text answer which was provided by the LLM when generating the query.
   */
  answer?: string;
  /**
   * Results from executing the query.
   * Available when {@link GenerateEsqlOptions.execute} is `'data'` or `'schema'`
   * and the query ran successfully. When `'schema'`, `values` is a probe sample
   * of at most one row, not the full result set.
   */
  results?: EsqlResponse;
  /**
   * Error message if the query could not be executed
   */
  error?: string;
}

/**
 * Model input for {@link generateEsql}.
 * Either a `modelProvider` (allowing model selection) or an already-resolved `model` (legacy path).
 */
export type GenerateEsqlModelDeps =
  | { modelProvider: ModelProvider; model?: never }
  | { model: ScopedModel; modelProvider?: never };

export type GenerateEsqlDeps = GenerateEsqlModelDeps & {
  esClient: ElasticsearchClient;
  logger: Logger;
  events?: ToolEventEmitter;
};

type GenerateEsqlExecute = 'none' | 'schema' | 'data';

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
   * How to run the generated query.
   * - `'data'` (default): execute and return rows — search and other callers that
   *   need the result set.
   * - `'schema'`: probe-execute to validate and collect columns (`LIMIT 1`,
   *   keep all-null columns). Does not change the generated query text.
   *   `results.values` is a sample of at most one row, not the dataset.
   *   Use this when rows are not the product (e.g. visualization authoring).
   * - `'none'`: do not execute; AST-validate only.
   */
  execute?: GenerateEsqlExecute;
  /**
   * Maximum number of retries if the query fails (execute or AST validation).
   * When `execute` is `'data'` or `'schema'`: retries after execution errors;
   * when `'none'`: retries after AST validation errors.
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
   * Defaults to {@link DEFAULT_ESQL_TIME_RANGE} when omitted.
   */
  timeRange?: TimeRange;
  /**
   * If true, omits the instruction to use named parameters (?_tstart, ?_tend)
   * for time range filtering in generated queries.
   */
  disableNamedParams?: boolean;
  /**
   * If true, external ES|QL datasets are considered when discovering and resolving the target.
   */
  includeDatasets?: boolean;
  /**
   * If true, frozen tier indices are queried.
   */
  includeFrozen?: boolean;
  /**
   * EIS session id for best-effort provider stickiness across calls. Non-EIS connectors ignore it.
   */
  sessionId?: string;
}

export type GenerateEsqlParams = GenerateEsqlOptions & GenerateEsqlDeps;

export const generateEsql = async ({
  nlQuery,
  index,
  execute = 'data',
  additionalInstructions,
  additionalContext,
  maxRetries = 3,
  rowLimit,
  timeRange: inputTimeRange,
  disableNamedParams,
  includeDatasets = false,
  includeFrozen = false,
  model: inputModel,
  modelProvider,
  esClient,
  logger,
  sessionId,
}: GenerateEsqlParams): Promise<GenerateEsqlResponse> => {
  const model = modelProvider
    ? await modelProvider.selectModel({ effortLevel: EffortLevels.low })
    : inputModel!;
  const timeRange = inputTimeRange ?? DEFAULT_ESQL_TIME_RANGE;
  const docBase = await EsqlDocumentBase.load();
  const documentation = await loadDocumentation();
  const esqlCallbacks = buildServerESQLCallbacks({ client: esClient });

  const graph = createNlToEsqlGraph({
    model,
    esClient,
    docBase,
    documentation,
    esqlCallbacks,
    includeDatasets,
    includeFrozen,
    sessionId,
  });

  return withActiveInferenceSpan(
    'generate_esql',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
      },
    },
    async () => {
      try {
        const nlQueryWithContext = additionalContext?.trim()
          ? `${nlQuery.trim()}\n\n${additionalContext.trim()}`
          : nlQuery.trim();

        let selectedTarget = index;
        let precomputedDocAction: RequestDocumentationAction | undefined;

        if (!selectedTarget) {
          // Pre-fetch doc keywords from the NL query alone, in parallel with index discovery.
          // The resource-less prompt is an accepted quality tradeoff for the latency win.
          const requestDocModel = model.chatModel.withStructuredOutput(requestDocumentationSchema, {
            name: 'request_documentation',
          });
          const docPromise = requestDocModel
            .invoke(createRequestDocumentationPromptNoResource({ nlQuery, documentation }))
            .then(({ commands = [], functions = [] }) => {
              const requestedKeywords = [...commands, ...functions];
              return {
                type: 'request_documentation' as const,
                requestedKeywords,
                fetchedDoc: docBase.getDocumentation(requestedKeywords),
              };
            });

          const [
            {
              resources: [selectedResource],
            },
            docAction,
          ] = await Promise.all([
            indexExplorer({
              nlQuery: nlQueryWithContext,
              esClient,
              limit: 1,
              includeDatasets,
              includeFrozen,
              model,
              logger,
            }),
            docPromise,
          ]);
          if (!selectedResource) {
            throw new GenerateEsqlNoDataError(
              'Could not discover a suitable index for the query. Please specify an index explicitly.'
            );
          }
          selectedTarget = selectedResource.name;
          logger?.debug(`Discovered target index: ${selectedTarget}`);
          precomputedDocAction = docAction;
        }

        const outState = await graph.invoke(
          {
            nlQuery,
            target: selectedTarget,
            execute,
            maxRetries,
            additionalInstructions,
            additionalContext,
            rowLimit,
            disableNamedParams,
            timeRange,
            // Empty when index is known — graph runs request_documentation in-graph with resource context.
            actions: precomputedDocAction ? [precomputedDocAction] : [],
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
        if (e instanceof GenerateEsqlNoDataError) {
          throw e;
        }
        throw new Error(`Could not generate ESQL query: ${e.message}`);
      }
    }
  );
};
