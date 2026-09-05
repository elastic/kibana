/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { Feature } from '@kbn/significant-events-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  ChatCompletionTokenCount,
  BoundInferenceClient,
  ToolCallback,
  ToolDefinition,
} from '@kbn/inference-common';
import {
  executeAsReasoningAgent,
  type ReasoningPromptDiagnostics,
} from '@kbn/inference-prompt-utils';
import { withSpan } from '@kbn/apm-utils';
import { createGenerateSignificantEventsPrompt } from './prompt';
import { sumTokens } from '../helpers/sum_tokens';
import { getComputedFeatureInstructions } from '../features/computed';
import {
  SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES,
  QUERY_GENERATION_EXCLUDED_FEATURE_TYPES,
  getFeatureQueryFromToolArgs,
  resolveFeatureTypeFilters,
  toFeatureForLlmContext,
} from './tools/features_tool';
import {
  createDefaultSignificantEventsToolUsage,
  type SignificantEventsToolUsage,
} from './tools/tool_usage';
import {
  createQueryValidationContext,
  DEFAULT_QUERY_VALIDATION_TIMEOUT_MS,
  validateKIQueries,
  type CandidateKIQuery,
  type ExistingQuerySummary,
  type QueryAttempt,
  type ValidatedKIQuery,
} from './validate_ki_queries';

export {
  computeValidationLookback,
  DEFAULT_QUERY_VALIDATION_TIMEOUT_MS,
  type ExistingQuerySummary,
  type QueryAttempt,
  type QueryAttemptFailureReason,
  type QueryAttemptStatus,
} from './validate_ki_queries';

export const DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT = 50;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Generate KI queries using a reasoning agent that fetches
 * stream features (including computed dataset analysis) via tool calls.
 */
export async function identifyKIQueries({
  stream,
  esClient,
  getFeatures,
  inferenceClient,
  signal,
  systemPrompt,
  logger,
  additionalTools,
  additionalToolCallbacks,
  existingQueries,
  maxExistingQueriesForContext = DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT,
  maxSteps,
  maxDurationMs,
  queryValidationTimeoutMs = DEFAULT_QUERY_VALIDATION_TIMEOUT_MS,
  requireQueryIntent = false,
  collectQueryAttempts = false,
}: {
  stream: Streams.all.Definition;
  esClient: ElasticsearchClient;
  getFeatures(params?: {
    type?: string[];
    minConfidence?: number;
    limit?: number;
  }): Promise<Feature[]>;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  systemPrompt: string;
  additionalTools?: Record<string, ToolDefinition>;
  additionalToolCallbacks?: Record<string, ToolCallback>;
  existingQueries?: ExistingQuerySummary[];
  maxExistingQueriesForContext?: number;
  /**
   * Overrides the reasoning agent step budget. Defaults to 6 when extra tool
   * callbacks are provided, otherwise 4. Pass a higher value when additional
   * tools (e.g. code grounding) add round-trips.
   */
  maxSteps?: number;
  /** Optional wall-clock budget for the reasoning loop. */
  maxDurationMs?: number;
  queryValidationTimeoutMs?: number;
  /** Eval-only: require `expects_matches` on every add_queries item. */
  requireQueryIntent?: boolean;
  /** Eval-only: return a record of every attempted query, incl. rejected ones. */
  collectQueryAttempts?: boolean;
}): Promise<{
  queries: ValidatedKIQuery[];
  tokensUsed: ChatCompletionTokenCount;
  toolUsage: SignificantEventsToolUsage;
  reasoningDiagnostics: ReasoningPromptDiagnostics;
  queryAttempts?: QueryAttempt[];
}> {
  logger.debug('Starting Significant Events KI query generation');

  const toolUsage = createDefaultSignificantEventsToolUsage();

  const prompt = createGenerateSignificantEventsPrompt({
    systemPrompt,
    additionalTools,
    requireQueryIntent,
  });

  const existingQueriesList = existingQueries ?? [];
  const validationContext = await createQueryValidationContext({
    stream,
    esClient,
    existingQueries: existingQueriesList,
    signal,
    logger,
  });

  const contextLimit = Math.max(0, Math.floor(maxExistingQueriesForContext));

  const existingQueriesContext = existingQueriesList.length
    ? JSON.stringify(
        [...existingQueriesList]
          .sort((a, b) => (b.severity_score ?? 0) - (a.severity_score ?? 0))
          .slice(0, contextLimit)
      )
    : '';

  let returnedFeatureCount = 0;
  const validatedQueries: ValidatedKIQuery[] = [];
  const queryAttempts: QueryAttempt[] | undefined = collectQueryAttempts ? [] : undefined;
  const resolvedMaxSteps = maxSteps ?? (additionalToolCallbacks ? 6 : 4);

  logger.trace('Generating Significant Events KI queries via reasoning agent');
  const response = await withSpan('generate_significant_events', () =>
    executeAsReasoningAgent({
      input: {
        name: stream.name,
        description: stream.description,
        available_feature_types: SIGNIFICANT_EVENTS_FEATURE_TOOL_TYPES.join(', '),
        computed_feature_instructions: getComputedFeatureInstructions(
          QUERY_GENERATION_EXCLUDED_FEATURE_TYPES
        ),
        existing_queries: existingQueriesContext,
      },
      maxSteps: resolvedMaxSteps,
      maxDurationMs,
      prompt,
      inferenceClient,
      toolCallbacks: {
        get_stream_features: async (toolCall) => {
          toolUsage.get_stream_features.calls += 1;
          const startTime = Date.now();
          try {
            // Keep this intentionally permissive: ignore unknown tool args instead of failing generation.
            const { featureTypes, minConfidence, limit } = getFeatureQueryFromToolArgs(
              toolCall.function.arguments
            );
            const typeFilters = resolveFeatureTypeFilters(featureTypes);
            const features = await withSpan('get_stream_features_for_significant_events', () =>
              getFeatures({
                type: typeFilters,
                minConfidence,
                limit,
              })
            );
            const llmFeatures = features.map(toFeatureForLlmContext);
            returnedFeatureCount = llmFeatures.length;

            return {
              response: {
                features: llmFeatures,
                count: llmFeatures.length,
              },
            };
          } catch (error) {
            toolUsage.get_stream_features.failures += 1;
            const errorMessage = getErrorMessage(error);
            logger.warn(`Failed to fetch stream features: ${errorMessage}`);
            return {
              response: {
                features: [],
                count: 0,
                error: errorMessage,
              },
            };
          } finally {
            toolUsage.get_stream_features.latency_ms += Date.now() - startTime;
          }
        },
        add_queries: async (toolCall) => {
          toolUsage.add_queries.calls += 1;
          const startTime = Date.now();

          const queries = toolCall.function.arguments.queries;
          if (!Array.isArray(queries)) {
            toolUsage.add_queries.failures += 1;
            return {
              response: {
                queries: [],
                error: 'Invalid payload: "queries" must be an array.',
              },
            };
          }
          // Reload authoritative features because Agent Builder tool calls cannot share closure state.
          const features = await getFeatures();
          const {
            results: queryValidationResults,
            acceptedQueries,
            attempts,
            hasNonIntentFailures,
            hasIntentFailures,
          } = await validateKIQueries({
            queries: queries as CandidateKIQuery[],
            features,
            context: validationContext,
            esClient,
            signal,
            logger,
            queryValidationTimeoutMs,
            requireQueryIntent,
            collectQueryAttempts,
          });

          validatedQueries.push(...acceptedQueries);
          if (attempts && queryAttempts) {
            queryAttempts.push(...attempts);
          }
          if (hasNonIntentFailures) {
            toolUsage.add_queries.failures += 1;
          }
          if (hasIntentFailures) {
            logger.debug(
              `add_queries call omitted "expects_matches"; rejected for repair without counting a tool failure`
            );
          }
          toolUsage.add_queries.latency_ms += Date.now() - startTime;

          return {
            response: {
              queries: queryValidationResults,
            },
          };
        },
        ...(additionalToolCallbacks ?? {}),
      },
      abortSignal: signal,
    })
  );

  if (validatedQueries.length === 0) {
    const observed =
      toolUsage.get_stream_features.calls === 0
        ? 'no_get_stream_features_calls'
        : toolUsage.get_stream_features.failures === toolUsage.get_stream_features.calls
        ? 'get_stream_features_failed'
        : toolUsage.add_queries.calls > 0
        ? 'add_queries_called_no_accepted_queries'
        : returnedFeatureCount === 0
        ? 'no_features_returned'
        : 'no_add_queries_calls';
    const message =
      `Generated 0 Significant Event KI queries: ` +
      `observed=${observed}, max_steps=${resolvedMaxSteps}, ` +
      `features_returned=${returnedFeatureCount}, ` +
      `get_stream_features_calls=${toolUsage.get_stream_features.calls}, ` +
      `get_stream_features_failures=${toolUsage.get_stream_features.failures}, ` +
      `add_queries_calls=${toolUsage.add_queries.calls}, ` +
      `add_queries_failures=${toolUsage.add_queries.failures}`;

    if (observed === 'no_features_returned') {
      logger.debug(message);
    } else {
      logger.warn(message);
    }
  } else {
    logger.debug(`Generated ${validatedQueries.length} Significant Event KI queries`);
  }

  return {
    queries: validatedQueries,
    tokensUsed: sumTokens({ added: response.tokens }),
    toolUsage,
    reasoningDiagnostics: response.diagnostics,
    ...(collectQueryAttempts && queryAttempts ? { queryAttempts } : {}),
  };
}
