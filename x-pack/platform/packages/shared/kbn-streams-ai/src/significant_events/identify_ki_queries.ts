/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { QueryType } from '@kbn/significant-events-schema';
import type { Feature, QueryFeature } from '@kbn/significant-events-schema';
import {
  deriveQueryType,
  findOverBroadMatchPredicates,
  renderOverBroadMatchError,
  getSourcesForStream,
  getStatsQueryHints,
  normalizeEsqlSafe,
  replaceFromSources,
  withUnmappedFieldsDirective,
} from '@kbn/streams-schema';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  ChatCompletionTokenCount,
  BoundInferenceClient,
  ToolCallback,
  ToolDefinition,
} from '@kbn/inference-common';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { withSpan } from '@kbn/apm-utils';
import { createGenerateSignificantEventsPrompt } from './prompt';
import type { SignificantEventType } from './types';
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

export const DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT = 50;

export const DEFAULT_QUERY_VALIDATION_TIMEOUT_MS = 10_000;

/**
 * Window the volume probe measures over. Kept short so the probe itself
 * is cheap.
 */
const PROBE_WINDOW_MINUTES = 10;

// Features are extracted over the trailing 24h, so validation must cover at least that window
// or a rare-but-real signal from hours ago becomes indistinguishable from a value that never occurs.
const MIN_LOOKBACK_MINUTES = 1_440;

/**
 * Approximate document budget validation should touch. The lookback is
 * sized so that, at the rate observed by the probe, roughly this many
 * documents fall inside the window regardless of how dense or sparse the
 * stream is - dense streams get a narrow (fast) window, sparse streams get a
 * wider one so validation still runs against real data.
 */
const TARGET_VALIDATION_DOCS = 100_000;

/**
 * Upper bound on how far the lookback can widen for a stream with little to
 * no data in the probe window, so a near-empty stream doesn't push
 * validation queries against unbounded history.
 */
const MAX_LOOKBACK_MINUTES = 10_080; // 7 days

/**
 * Timeout for the volume probe itself, kept short and independent of
 * `queryValidationTimeoutMs` (which is tunable down to 1s). If the probe
 * shared that budget, a generally slow cluster would make the probe the
 * first thing to time out, silently regressing every call back to the
 * fallback window and defeating the point of probing at all.
 */
const PROBE_TIMEOUT_MS = 5_000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Sizes the `@timestamp` lookback used to validate candidate KI queries.
 * Floored at the 24h feature-evidence window; widens (up to 7 days) for
 * sparse streams so validation still runs against real data.
 *
 * `sources` may be an ES|QL view (query streams resolve to a `$.`-prefixed
 * view with no backing index - see `getSourcesForStream`), so volume is
 * probed via ES|QL rather than the `_count` API, which cannot resolve views.
 *
 * @internal Exported for testing purposes only
 */
export async function computeValidationLookback({
  esClient,
  sources,
  signal,
  logger,
}: {
  esClient: ElasticsearchClient;
  sources: string[];
  signal: AbortSignal;
  logger: Logger;
}): Promise<string> {
  const probeWindow = `now-${PROBE_WINDOW_MINUTES}m`;
  try {
    const response = (await esClient.esql.query(
      {
        query: `FROM ${sources.join(', ')} | STATS total = COUNT(*)`,
        filter: {
          range: {
            '@timestamp': {
              gte: probeWindow,
              lte: 'now',
            },
          },
        },
      },
      { signal, requestTimeout: PROBE_TIMEOUT_MS }
    )) as unknown as ESQLSearchResponse;

    const total = Number(response.values[0]?.[0] ?? 0);
    if (total <= 0) {
      return `now-${MAX_LOOKBACK_MINUTES}m`;
    }

    const ratePerMinute = total / PROBE_WINDOW_MINUTES;
    const lookbackMinutes = Math.min(
      MAX_LOOKBACK_MINUTES,
      Math.max(MIN_LOOKBACK_MINUTES, Math.round(TARGET_VALIDATION_DOCS / ratePerMinute))
    );
    return `now-${lookbackMinutes}m`;
  } catch (error) {
    // Unlike a confirmed total of 0 (real evidence the stream is quiet, so
    // widening is justified), an error tells us nothing about density -
    // there's no basis to guess wide, so fall back to the evidence-window
    // floor that every derived lookback is clamped to anyway.
    logger.debug(
      () =>
        `Failed to probe validation volume for [${sources.join(
          ', '
        )}]; falling back to now-${MIN_LOOKBACK_MINUTES}m: ${getErrorMessage(error)}`
    );
    return `now-${MIN_LOOKBACK_MINUTES}m`;
  }
}

export interface ExistingQuerySummary {
  id: string;
  title: string;
  type: string;
  severity_score?: number;
  description: string;
  esql: string;
}

/**
 * Intermediate representation of a query as produced by the LLM tool output.
 * Uses a flat `esql` string (vs the wrapped `EsqlQuery` in the wire type)
 * and carries the `category` from the tool schema.
 */
interface ParsedToolQuery {
  type: QueryType;
  esql: string;
  title: string;
  description: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
  replaces?: string;
  expects_matches?: boolean;
  features: QueryFeature[];
}

export type QueryAttemptStatus = 'Added' | 'Duplicate' | 'Failed to add';

export type QueryAttemptFailureReason =
  | 'missing_intent'
  | 'unknown_features'
  | 'validation_error'
  | 'no_matches'
  | 'unmapped_field';

const UNKNOWN_COLUMN_PATTERN = /Unknown column \[([^\]]+)\]/g;

function extractUnknownColumns(message: string): string[] {
  const columns = new Set<string>();
  for (const match of message.matchAll(UNKNOWN_COLUMN_PATTERN)) {
    columns.add(match[1]);
  }
  return [...columns];
}

function isUnknownColumnError(message: string): boolean {
  return /Unknown column \[/.test(message);
}

function renderNoMatchesError(lookback: string): string {
  return (
    `Query matched 0 documents between ${lookback} and now, so it was NOT added. ` +
    `A 0-match usually means the field or literal is wrong - a mistyped value, a shortened form ` +
    `when only a qualified one is indexed, or a token that does not survive analysis. Correct the ` +
    `query and resubmit. Only if the condition is genuinely not present in this window (not yet ` +
    `occurring, or grounded solely in evidence older than the window) resubmit UNCHANGED with ` +
    `"expects_matches": false to record it as a watch.`
  );
}

function renderUnmappedFieldError(fields: string[]): string {
  return (
    `Query references field(s) not present in the queryable schema: [${fields.join(', ')}]. ` +
    `They exist in the raw documents but are not mapped, so they cannot be queried directly. ` +
    `Loading them from _source did find matching documents, so the value is real - switch to a ` +
    `mapped field that carries the same value (a free-text field often contains it inline) and ` +
    `match the value exactly as it appears in that field's sample values.`
  );
}

function renderUnknownFieldError(fields: string[], lookback: string): string {
  return (
    `Query references field(s) not present in the queryable schema: [${fields.join(', ')}], and ` +
    `loading them from _source found no matching documents between ${lookback} and now. Verify the ` +
    `field name against the dataset_analysis schema and the literal value, then resubmit a ` +
    `corrected query.`
  );
}

// Eval-only: one record per query across all add_queries calls, incl. rejected ones.
export interface QueryAttempt {
  title: string;
  esql: string;
  /** First-failure-wins, mirrors what the model is told. Not a duplicate-detection signal. */
  status: QueryAttemptStatus;
  replaces?: string;
  /**
   * Whether the query duplicates a seeded/existing one, determined independently of
   * `status` so an earlier validation gate cannot hide it.
   */
  exactDuplicate?: boolean;
  /** Why the attempt was rejected, when `status` is 'Failed to add'. */
  failureReason?: QueryAttemptFailureReason;
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
  queryValidationTimeoutMs?: number;
  /** Eval-only: require `expects_matches` on every add_queries item. */
  requireQueryIntent?: boolean;
  /** Eval-only: return a record of every attempted query, incl. rejected ones. */
  collectQueryAttempts?: boolean;
}): Promise<{
  queries: ParsedToolQuery[];
  tokensUsed: ChatCompletionTokenCount;
  toolUsage: SignificantEventsToolUsage;
  queryAttempts?: QueryAttempt[];
}> {
  logger.debug('Starting Significant Events KI query generation');

  const toolUsage = createDefaultSignificantEventsToolUsage();

  const prompt = createGenerateSignificantEventsPrompt({
    systemPrompt,
    additionalTools,
  });
  const targetSources = getSourcesForStream(stream);

  const validationLookback = await computeValidationLookback({
    esClient,
    sources: targetSources,
    signal,
    logger,
  });

  const existingQueriesList = existingQueries ?? [];

  // Candidates are compared after their FROM is rewritten, so seeds must be rewritten too or
  // nothing ever matches. Idempotent for stored queries, which already carry rewritten sources.
  const normalizedStoredEsqls = new Set(
    existingQueriesList.map((q) => normalizeEsqlSafe(replaceFromSources(q.esql, targetSources)))
  );

  const contextLimit = Math.max(0, Math.floor(maxExistingQueriesForContext));

  const existingQueriesContext = existingQueriesList.length
    ? JSON.stringify(
        [...existingQueriesList]
          .sort((a, b) => (b.severity_score ?? 0) - (a.severity_score ?? 0))
          .slice(0, contextLimit)
      )
    : '';

  const returnedFeatureMap = new Map<string, string | undefined>();
  const validatedQueries: ParsedToolQuery[] = [];
  const queryAttempts: QueryAttempt[] | undefined = collectQueryAttempts ? [] : undefined;

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
      maxSteps: maxSteps ?? (additionalToolCallbacks ? 6 : 4),
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

            for (const feature of features) {
              returnedFeatureMap.set(feature.id, feature.run_id);
            }

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
          // Tracked separately: a missing-intent rejection can only happen when the eval turns
          // `requireQueryIntent` on, so counting it in `add_queries.failures` would charge the model
          // for a rule that does not exist in production and make tool-usage scores incomparable.
          // The omission rate stays visible through `queryAttempts` (`failureReason`).
          let hasNonIntentFailures = false;
          let hasIntentFailures = false;

          const probeMatchCount = async (probeQuery: string): Promise<number> => {
            const probeResponse = (await esClient.esql.query(
              {
                query: probeQuery,
                filter: {
                  range: {
                    '@timestamp': {
                      gte: validationLookback,
                      lte: 'now',
                    },
                  },
                },
                format: 'json',
              },
              { signal, requestTimeout: queryValidationTimeoutMs }
            )) as unknown as ESQLSearchResponse;
            return Number(probeResponse.values?.[0]?.[0] ?? 0);
          };

          const queryValidationResults = await Promise.all(
            queries.map(async (query) => {
              // `status` is first-failure-wins, so a duplicate that also trips an earlier gate
              // would never be reported as one. Decide it up front, independently.
              const exactDuplicate = collectQueryAttempts
                ? normalizedStoredEsqls.has(
                    normalizeEsqlSafe(replaceFromSources(query.esql, targetSources))
                  )
                : undefined;

              if (requireQueryIntent && typeof query.expects_matches !== 'boolean') {
                hasIntentFailures = true;
                return {
                  query,
                  valid: false,
                  status: 'Failed to add' as const,
                  failureReason: 'missing_intent' as const,
                  exactDuplicate,
                  error:
                    'Missing intent: set "expects_matches" to true when the query is grounded in evidence currently present and should match rows in the evaluation window, or to false when it deliberately watches for a plausible future condition not present in the current evidence.',
                };
              }

              try {
                const derivedType: QueryType = deriveQueryType(query.esql);
                const warnings: string[] = [];

                if (query.type && query.type !== derivedType) {
                  warnings.push(
                    `Type mismatch: declared "${query.type}" but ES|QL content is "${derivedType}". Using derived type.`
                  );
                }

                const rawFeatureIds: string[] = query.feature_ids ?? [];
                const validFeatureIds: string[] = [];
                const invalidFeatureIds: string[] = [];
                for (const id of rawFeatureIds) {
                  (returnedFeatureMap.has(id) ? validFeatureIds : invalidFeatureIds).push(id);
                }

                if (validFeatureIds.length === 0) {
                  hasNonIntentFailures = true;
                  return {
                    query,
                    valid: false,
                    status: 'Failed to add' as const,
                    failureReason: 'unknown_features' as const,
                    exactDuplicate,
                    error: `feature_ids must reference at least one feature returned by get_stream_features. Unknown IDs: [${rawFeatureIds.join(
                      ', '
                    )}]`,
                  };
                }

                if (invalidFeatureIds.length > 0) {
                  warnings.push(`Stripped unknown feature_ids: [${invalidFeatureIds.join(', ')}]`);
                }

                const queryFeatures: QueryFeature[] = validFeatureIds.map((id) => ({
                  id,
                  run_id: returnedFeatureMap.get(id),
                }));

                const rewritten = replaceFromSources(query.esql, targetSources);

                if (normalizedStoredEsqls.has(normalizeEsqlSafe(rewritten))) {
                  return {
                    query: {
                      ...query,
                      type: derivedType,
                      esql: rewritten,
                    },
                    valid: false,
                    status: 'Duplicate' as const,
                    exactDuplicate,
                    error: 'This query already exists for this stream.',
                    hints: undefined,
                  };
                }

                // Static over-match - reject before the data probe.
                const overBroadPredicates = findOverBroadMatchPredicates(rewritten);
                if (overBroadPredicates.length > 0) {
                  hasNonIntentFailures = true;
                  return {
                    query,
                    valid: false,
                    status: 'Failed to add' as const,
                    failureReason: 'validation_error' as const,
                    exactDuplicate,
                    error: renderOverBroadMatchError(overBroadPredicates),
                  };
                }

                const hints = getStatsQueryHints(rewritten);

                let preflightUnknownColumnError: string | null = null;
                try {
                  await probeMatchCount(`${rewritten}\n| LIMIT 0`);
                } catch (preflightError) {
                  const preflightMessage = getErrorMessage(preflightError);
                  if (derivedType === 'stats' || !isUnknownColumnError(preflightMessage)) {
                    throw preflightError;
                  }
                  preflightUnknownColumnError = preflightMessage;
                }

                const isWatch = query.expects_matches === false;
                let effectiveExpectsMatches = query.expects_matches;

                if (derivedType === 'match') {
                  const existenceProbe = `${rewritten}\n| LIMIT 1\n| STATS COUNT(*)`;
                  let matchCount: number;
                  try {
                    matchCount = await probeMatchCount(existenceProbe);
                  } catch (probeError) {
                    const probeMessage = getErrorMessage(probeError);
                    if (!isUnknownColumnError(probeMessage)) throw probeError;

                    const fields = extractUnknownColumns(probeMessage);
                    let loadCount = 0;
                    try {
                      loadCount = await probeMatchCount(
                        withUnmappedFieldsDirective(existenceProbe)
                      );
                    } catch {
                      loadCount = 0;
                    }
                    hasNonIntentFailures = true;
                    return {
                      query,
                      valid: false,
                      status: 'Failed to add' as const,
                      failureReason: (loadCount > 0 ? 'unmapped_field' : 'no_matches') as const,
                      exactDuplicate,
                      error:
                        loadCount > 0
                          ? renderUnmappedFieldError(fields)
                          : renderUnknownFieldError(fields, validationLookback),
                    };
                  }

                  if (preflightUnknownColumnError !== null) {
                    throw new Error(preflightUnknownColumnError);
                  }

                  const matched = matchCount > 0;

                  if (isWatch) {
                    if (matched) {
                      effectiveExpectsMatches = true;
                      warnings.push(
                        'Marked as a watch (expects_matches=false) but matched the validation window; recorded as a live query (expects_matches=true).'
                      );
                    } else {
                      warnings.push(
                        'Accepted as a watch query (expects_matches=false): matched 0 documents in the validation window.'
                      );
                    }
                  } else if (!matched) {
                    hasNonIntentFailures = true;
                    return {
                      query,
                      valid: false,
                      status: 'Failed to add' as const,
                      failureReason: 'no_matches' as const,
                      exactDuplicate,
                      error: renderNoMatchesError(validationLookback),
                    };
                  }
                }

                validatedQueries.push({
                  type: derivedType,
                  esql: rewritten,
                  title: query.title,
                  description: query.description,
                  category: query.category,
                  severity_score: query.severity_score,
                  evidence: query.evidence,
                  replaces: query.replaces,
                  expects_matches: effectiveExpectsMatches,
                  features: queryFeatures,
                });

                const allHints = [...warnings, ...hints];
                return {
                  query: {
                    ...query,
                    type: derivedType,
                    esql: rewritten,
                    expects_matches: effectiveExpectsMatches,
                  },
                  valid: true,
                  status: 'Added' as const,
                  exactDuplicate,
                  error: undefined,
                  hints: allHints.length > 0 ? allHints : undefined,
                };
              } catch (error) {
                hasNonIntentFailures = true;
                logger.debug(
                  () =>
                    `ES|QL validation for query "${query.title}" failed: ${getErrorMessage(error)}`
                );
                return {
                  query,
                  valid: false,
                  status: 'Failed to add' as const,
                  failureReason: 'validation_error' as const,
                  exactDuplicate,
                  error: getErrorMessage(error),
                };
              }
            })
          );
          if (collectQueryAttempts && queryAttempts) {
            for (const result of queryValidationResults) {
              queryAttempts.push({
                title: result.query.title,
                esql: result.query.esql,
                status: result.status,
                replaces: result.query.replaces,
                exactDuplicate: result.exactDuplicate,
                ...('failureReason' in result ? { failureReason: result.failureReason } : {}),
              });
            }
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

  logger.debug(`Generated ${validatedQueries.length} Significant Event KI queries`);

  return {
    queries: validatedQueries,
    tokensUsed: sumTokens({ added: response.tokens }),
    toolUsage,
    ...(collectQueryAttempts && queryAttempts ? { queryAttempts } : {}),
  };
}
