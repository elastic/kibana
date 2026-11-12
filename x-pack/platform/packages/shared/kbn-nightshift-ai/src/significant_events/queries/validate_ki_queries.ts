/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder, Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import { esqlTimeRange, getMappingConflicts } from '@kbn/ai-tools';
import { timeoutSignal } from '@kbn/std';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Feature, QueryFeature, QueryType } from '@kbn/significant-events-schema';
import {
  deriveQueryType,
  extractReferencedColumns,
  findNonColumnFullTextArguments,
  findOverBroadMatchPredicates,
  getStatsQueryHints,
  normalizeEsqlSafe,
  renderNonColumnFullTextArgumentError,
  renderOverBroadMatchError,
  replaceFromSources,
} from '@kbn/streams-schema';
import type { SignificantEventType } from './types';

export const DEFAULT_QUERY_VALIDATION_TIMEOUT_MS = 15_000;

const PROBE_WINDOW_MINUTES = 10;
const TARGET_VALIDATION_DOCS = 100_000;
const MAX_LOOKBACK_MINUTES = 10_080;
const PROBE_TIMEOUT_MS = 5_000;
const MINUTE_MS = 60_000;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface ExistingQuerySummary {
  id: string;
  title: string;
  type: string;
  severity_score?: number;
  description: string;
  esql: string;
}

export interface CandidateKIQuery {
  type?: QueryType;
  esql: string;
  title: string;
  description: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
  replaces?: string;
  expects_matches?: boolean;
  feature_ids?: string[];
}

export interface ValidatedKIQuery {
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
export type QueryAttemptFailureReason = 'missing_intent' | 'unknown_features' | 'validation_error';

export interface QueryAttempt {
  title: string;
  esql: string;
  status: QueryAttemptStatus;
  replaces?: string;
  exactDuplicate?: boolean;
  failureReason?: QueryAttemptFailureReason;
}

export interface QueryValidationResult {
  query: CandidateKIQuery;
  valid: boolean;
  status: QueryAttemptStatus;
  exactDuplicate?: boolean;
  failureReason?: QueryAttemptFailureReason;
  error?: string;
  hints?: string[];
}

export interface QueryValidationContext {
  targetSources: string[];
  validationLookbackMinutes: number;
  conflictingFields: Set<string>;
  normalizedStoredEsqls: Set<string>;
}

const addInlineTimeRange = ({
  query,
  start,
  end,
}: {
  query: string;
  start: number;
  end: number;
}): string => {
  const { root } = Parser.parse(query);
  const sourceCommandIndex = root.commands.findIndex(
    ({ name }) => name === 'from' || name === 'ts'
  );
  if (sourceCommandIndex === -1) {
    return query;
  }

  const whereCommand = Builder.command({ name: 'where', args: [esqlTimeRange(start, end)] });
  const commands = [...root.commands];
  commands.splice(sourceCommandIndex + 1, 0, whereCommand);
  return BasicPrettyPrinter.print(Builder.expression.query(commands as ESQLCommand[]));
};

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
}): Promise<number> {
  const probeEnd = Date.now();
  const probeStart = probeEnd - PROBE_WINDOW_MINUTES * MINUTE_MS;
  try {
    const response = (await esClient.esql.query(
      {
        query: addInlineTimeRange({
          query: `FROM ${sources.join(', ')} | STATS total = COUNT(*)`,
          start: probeStart,
          end: probeEnd,
        }),
      },
      { signal, requestTimeout: PROBE_TIMEOUT_MS }
    )) as unknown as ESQLSearchResponse;

    const total = Number(response.values[0]?.[0] ?? 0);
    if (total <= 0) {
      return MAX_LOOKBACK_MINUTES;
    }

    const ratePerMinute = total / PROBE_WINDOW_MINUTES;
    return Math.min(
      MAX_LOOKBACK_MINUTES,
      Math.max(PROBE_WINDOW_MINUTES, Math.round(TARGET_VALIDATION_DOCS / ratePerMinute))
    );
  } catch (error) {
    logger.debug(
      () =>
        `Failed to probe validation volume for [${sources.join(
          ', '
        )}]; falling back to ${PROBE_WINDOW_MINUTES} minutes: ${getErrorMessage(error)}`
    );
    return PROBE_WINDOW_MINUTES;
  }
}

export async function createQueryValidationContext({
  sources,
  esClient,
  existingQueries = [],
  signal,
  logger,
}: {
  sources: string[];
  esClient: ElasticsearchClient;
  existingQueries?: ExistingQuerySummary[];
  signal: AbortSignal;
  logger: Logger;
}): Promise<QueryValidationContext> {
  const targetSources = sources;
  const deadline = timeoutSignal(15_000);
  try {
    const [validationLookbackMinutes, mappingConflicts] = await Promise.all([
      computeValidationLookback({ esClient, sources: targetSources, signal, logger }),
      getMappingConflicts({
        esClient,
        index: targetSources,
        signal: AbortSignal.any([signal, deadline]),
      }).catch((error) => {
        logger.debug(
          () =>
            `Failed to probe mapping conflicts for [${targetSources.join(', ')}]: ${getErrorMessage(
              error
            )}`
        );
        return [];
      }),
    ]);

    return {
      targetSources,
      validationLookbackMinutes,
      conflictingFields: new Set(mappingConflicts.map(({ field }) => field)),
      normalizedStoredEsqls: new Set(
        existingQueries.map(({ esql }) =>
          normalizeEsqlSafe(replaceFromSources(esql, targetSources))
        )
      ),
    };
  } finally {
    deadline.dispose();
  }
}

export async function validateKIQueries({
  queries,
  features,
  context,
  esClient,
  signal,
  logger,
  queryValidationTimeoutMs = DEFAULT_QUERY_VALIDATION_TIMEOUT_MS,
  requireQueryIntent = false,
  collectQueryAttempts = false,
}: {
  queries: CandidateKIQuery[];
  features: Feature[];
  context: QueryValidationContext;
  esClient: ElasticsearchClient;
  signal: AbortSignal;
  logger: Logger;
  queryValidationTimeoutMs?: number;
  requireQueryIntent?: boolean;
  collectQueryAttempts?: boolean;
}): Promise<{
  results: QueryValidationResult[];
  acceptedQueries: ValidatedKIQuery[];
  attempts?: QueryAttempt[];
  hasNonIntentFailures: boolean;
  hasIntentFailures: boolean;
}> {
  const { targetSources, validationLookbackMinutes, conflictingFields, normalizedStoredEsqls } =
    context;
  const featureMap = new Map(features.map(({ id, run_id: runId }) => [id, runId]));
  const validationEnd = Date.now();
  const validationStart = validationEnd - validationLookbackMinutes * MINUTE_MS;
  let hasNonIntentFailures = false;
  let hasIntentFailures = false;

  const acceptedQueries: ValidatedKIQuery[] = [];
  const results = await Promise.all(
    queries.map(async (query): Promise<QueryValidationResult> => {
      let exactDuplicate: boolean | undefined;

      try {
        const rewritten = replaceFromSources(query.esql, targetSources);
        exactDuplicate = collectQueryAttempts
          ? normalizedStoredEsqls.has(normalizeEsqlSafe(rewritten))
          : undefined;

        if (requireQueryIntent && typeof query.expects_matches !== 'boolean') {
          hasIntentFailures = true;
          return {
            query,
            valid: false,
            status: 'Failed to add',
            failureReason: 'missing_intent',
            exactDuplicate,
            error:
              'Missing intent: set "expects_matches" to true when the query is grounded in evidence currently present and should match rows in the evaluation window, or to false when it deliberately watches for a plausible future condition not present in the current evidence.',
          };
        }

        const derivedType = deriveQueryType(query.esql);
        const warnings: string[] = [];
        if (query.type && query.type !== derivedType) {
          warnings.push(
            `Type mismatch: declared "${query.type}" but ES|QL content is "${derivedType}". Using derived type.`
          );
        }

        const rawFeatureIds = query.feature_ids ?? [];
        const validFeatureIds = rawFeatureIds.filter((id) => featureMap.has(id));
        const invalidFeatureIds = rawFeatureIds.filter((id) => !featureMap.has(id));
        if (validFeatureIds.length === 0) {
          hasNonIntentFailures = true;
          return {
            query,
            valid: false,
            status: 'Failed to add',
            failureReason: 'unknown_features',
            exactDuplicate,
            error: `feature_ids must reference at least one feature belonging to this source. Unknown IDs: [${rawFeatureIds.join(
              ', '
            )}]`,
          };
        }
        if (invalidFeatureIds.length > 0) {
          warnings.push(`Stripped unknown feature_ids: [${invalidFeatureIds.join(', ')}]`);
        }

        if (normalizedStoredEsqls.has(normalizeEsqlSafe(rewritten))) {
          return {
            query: { ...query, type: derivedType, esql: rewritten },
            valid: false,
            status: 'Duplicate',
            exactDuplicate,
            error: 'This query already exists for this source.',
          };
        }

        const nonColumnFullTextArguments = findNonColumnFullTextArguments(rewritten);
        if (nonColumnFullTextArguments.length > 0) {
          hasNonIntentFailures = true;
          return {
            query,
            valid: false,
            status: 'Failed to add',
            failureReason: 'validation_error',
            exactDuplicate,
            error: renderNonColumnFullTextArgumentError(nonColumnFullTextArguments),
          };
        }

        const overBroadPredicates = findOverBroadMatchPredicates(rewritten);
        if (overBroadPredicates.length > 0) {
          hasNonIntentFailures = true;
          return {
            query,
            valid: false,
            status: 'Failed to add',
            failureReason: 'validation_error',
            exactDuplicate,
            error: renderOverBroadMatchError(overBroadPredicates),
          };
        }

        const hints = getStatsQueryHints(rewritten);
        const validateOverFullSource =
          conflictingFields.size > 0 &&
          extractReferencedColumns(rewritten).some((name) => conflictingFields.has(name));

        const validationQuery = validateOverFullSource
          ? rewritten
          : addInlineTimeRange({
              query: rewritten,
              start: validationStart,
              end: validationEnd,
            });

        await esClient.esql.query(
          {
            query: `${validationQuery}\n| LIMIT 0`,
            format: 'json',
          },
          { signal, requestTimeout: queryValidationTimeoutMs }
        );

        const queryFeatures: QueryFeature[] = validFeatureIds.map((id) => ({
          id,
          run_id: featureMap.get(id),
        }));
        acceptedQueries.push({
          type: derivedType,
          esql: rewritten,
          title: query.title,
          description: query.description,
          category: query.category,
          severity_score: query.severity_score,
          evidence: query.evidence,
          replaces: query.replaces,
          expects_matches: query.expects_matches,
          features: queryFeatures,
        });

        const allHints = [...warnings, ...hints];
        return {
          query: { ...query, type: derivedType, esql: rewritten },
          valid: true,
          status: 'Added',
          exactDuplicate,
          hints: allHints.length > 0 ? allHints : undefined,
        };
      } catch (error) {
        hasNonIntentFailures = true;
        logger.debug(
          () => `ES|QL validation for query "${query.title}" failed: ${getErrorMessage(error)}`
        );
        return {
          query,
          valid: false,
          status: 'Failed to add',
          failureReason: 'validation_error',
          exactDuplicate,
          error: getErrorMessage(error),
        };
      }
    })
  );

  const attempts = collectQueryAttempts
    ? results.map(({ query, status, exactDuplicate, failureReason }) => ({
        title: query.title,
        esql: query.esql,
        status,
        replaces: query.replaces,
        exactDuplicate,
        ...(failureReason ? { failureReason } : {}),
      }))
    : undefined;

  return {
    results,
    acceptedQueries,
    attempts,
    hasNonIntentFailures,
    hasIntentFailures,
  };
}
