/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan, ElasticGenAIAttributes } from '@kbn/inference-tracing';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { EffortLevels } from '@kbn/agent-builder-common';
import type { ModelProvider, ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { EsqlDocumentBase } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { buildServerESQLCallbacks } from '@kbn/esql-server-utils';
import type { EsqlResponse } from '../utils/esql';
import type { SourcePin } from './graph';
import { createNlToEsqlGraph, requestDocumentationSchema } from './graph';
import type { RequestDocumentationAction } from './actions';
import { indexExplorer } from '../index_explorer';
import { loadDocumentation } from './documentation';
import { createRequestDocumentationPromptNoResource } from './prompts';
import { withPromqlKeyword } from './promql_keyword';
import { resolveQueryTarget } from './resolve_query_target';

export const DEFAULT_EXECUTION_TIMEOUT_MS = 30_000;

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
  internalEsClient?: ElasticsearchClient;
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
   * The resource (index, datastream, alias, or ES|QL view) to target
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
   * How long, in milliseconds, a generated query may run before it is given up on. Applies to
   * every execution of the generation loop.
   * Defaults to {@link DEFAULT_EXECUTION_TIMEOUT_MS} (30 seconds).
   */
  executionTimeoutMs?: number;
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
  /** The values of the dashboard controls a query may refer to (`?name`), bound when a candidate is executed. */
  esqlVariables?: ESQLControlVariable[];
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
   * If true, ES|QL views are considered when discovering and resolving the target.
   */
  includeViews?: boolean;
  /**
   * If true, frozen tier indices are queried.
   */
  includeFrozen?: boolean;
  /**
   * EIS session id for best-effort provider stickiness across calls. Non-EIS connectors ignore it.
   */
  sessionId?: string;
  /**
   * The query in the user's editor. With `sourceResolution: 'cascade'`, its sources are the
   * target.
   */
  currentQuery?: string;
  /**
   * How the target is chosen when `index` is not given.
   * - `'llm_picker'` (default): a model picks one source from the catalog; no pick throws
   *   {@link GenerateEsqlNoDataError}.
   * - `'cascade'`: the current query's sources, and the generated query is pinned to them.
   *   Without usable current sources, the model picks one as with `'llm_picker'`.
   */
  sourceResolution?: 'llm_picker' | 'cascade';
}

export type GenerateEsqlParams = GenerateEsqlOptions & GenerateEsqlDeps;

/**
 * Whether the instruction asks for a source command (`TS`, `FROM`, PromQL, time series), in
 * which case the current one is not pinned. `FROM` and `TS` count only in capitals.
 */
const requestsSourceCommand = (nlQuery: string): boolean =>
  /\b(?:FROM|TS)\b/.test(nlQuery) || /\b(?:promql|time[ -]?series)\b/i.test(nlQuery);

export const generateEsql = async ({
  nlQuery,
  index,
  execute = 'data',
  additionalInstructions,
  additionalContext,
  maxRetries = 3,
  executionTimeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS,
  rowLimit,
  timeRange: inputTimeRange,
  esqlVariables,
  disableNamedParams,
  includeDatasets = false,
  includeViews = false,
  includeFrozen = false,
  model: inputModel,
  modelProvider,
  esClient,
  internalEsClient,
  logger,
  sessionId,
  currentQuery,
  sourceResolution = 'llm_picker',
}: GenerateEsqlParams): Promise<GenerateEsqlResponse> => {
  const model = modelProvider
    ? await modelProvider.selectModel({ effortLevel: EffortLevels.low })
    : inputModel!;
  const timeRange = inputTimeRange ?? { from: 'now-24h', to: 'now' };
  const docBase = await EsqlDocumentBase.load();
  const documentation = await loadDocumentation();
  const esqlCallbacks = buildServerESQLCallbacks({
    esClient: { asCurrentUser: esClient, asInternalUser: internalEsClient ?? esClient },
    logger,
  });

  const createGraph = (
    extra: Pick<Parameters<typeof createNlToEsqlGraph>[0], 'resolveResource' | 'sourcePin'> = {}
  ) =>
    createNlToEsqlGraph({
      model,
      esClient,
      docBase,
      documentation,
      esqlCallbacks,
      includeDatasets,
      includeViews,
      includeFrozen,
      sessionId,
      ...extra,
    });

  // Doc keywords from the NL query alone, fetched in parallel with source discovery.
  // The resource-less prompt is an accepted quality tradeoff for the latency win.
  const prefetchDocumentation = (): Promise<RequestDocumentationAction> => {
    const requestDocModel = model.chatModel.withStructuredOutput(requestDocumentationSchema, {
      name: 'request_documentation',
    });
    return requestDocModel
      .invoke(
        createRequestDocumentationPromptNoResource({
          nlQuery,
          documentation,
          additionalContext,
        })
      )
      .then(({ commands = [], functions = [] }) => {
        const requestedKeywords = withPromqlKeyword(
          [...commands, ...functions],
          nlQuery,
          additionalContext
        );
        return {
          type: 'request_documentation' as const,
          requestedKeywords,
          fetchedDoc: docBase.getDocumentation(requestedKeywords),
        };
      });
  };

  const invokeGraph = (
    graph: ReturnType<typeof createNlToEsqlGraph>,
    target: string,
    actions: RequestDocumentationAction[]
  ) =>
    graph.invoke(
      {
        nlQuery,
        target,
        execute,
        maxRetries,
        additionalInstructions,
        additionalContext,
        rowLimit,
        disableNamedParams,
        timeRange,
        esqlVariables,
        executionTimeoutMs,
        // Empty when the target is known up front: the graph requests documentation itself,
        // with the resource as context.
        actions,
      },
      {
        recursionLimit: 25,
        tags: ['generate_esql'],
        metadata: { graphName: 'generate_esql' },
      }
    );

  /**
   * The cascade path: when the current query has sources, generate a query pinned to them.
   * Returns undefined when it has none, so the caller discovers a source.
   */
  const generateFromCurrentQuery = async (): Promise<GenerateEsqlResponse | undefined> => {
    const current = await resolveQueryTarget({
      currentQuery,
      esClient,
      logger,
      includeDatasets,
      includeViews,
      includeFrozen,
    });
    if (!current) {
      return undefined;
    }

    const { resource } = current;
    const sourcePin: SourcePin = {
      ...(current.sourceCommand && !requestsSourceCommand(nlQuery)
        ? { sourceCommand: current.sourceCommand }
        : {}),
      ...(current.projectRouting ? { projectRouting: current.projectRouting } : {}),
    };
    const graph = createGraph({ resolveResource: async () => resource, sourcePin });
    const outState = await invokeGraph(graph, resource.name, []);

    return {
      error: outState.error,
      answer: outState.answer,
      query: outState.query,
      results: outState.results,
    };
  };

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

        if (sourceResolution === 'cascade' && !index) {
          const fromCurrentQuery = await generateFromCurrentQuery();
          if (fromCurrentQuery) {
            return fromCurrentQuery;
          }
        }

        let selectedTarget = index;
        let precomputedDocAction: RequestDocumentationAction | undefined;

        if (!selectedTarget) {
          const docPromise = prefetchDocumentation();

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
              includeViews,
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

        const outState = await invokeGraph(
          createGraph(),
          selectedTarget,
          precomputedDocAction ? [precomputedDocAction] : []
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
