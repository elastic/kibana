/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { Condition } from '@kbn/streamlang';
import { isNotEmptyCondition } from '../../../common/domain/definitions/common_fields';
import { isSingleFieldIdentity } from '../../../common/domain/definitions/entity_schema';
import { getBuiltInEntityDefinition } from '../../../common/domain/definitions/registry';
import { USER_ENTITY_NAMESPACE } from '../../../common/domain/definitions/user_entity_constants';
import {
  buildOneFieldEvaluationEsql,
  getFieldEvaluationsEsql,
} from '../../../common/domain/euid/esql';
import { entityStoreConditionToESQL as conditionToESQL } from '../../../common/esql/condition_to_esql';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { withInternalEsqlViewExclusions } from '../../domain/logs_extraction/internal_esql_view_patterns';
import { roundSampleProbability } from '../../domain/logs_extraction/log_pagination_probe_query_builder';
import { NULLIFY_UNMAPPED_FIELDS_SETTING } from '../../domain/logs_extraction/query_builder_commons';
import type { LogCoverageEventPayload } from '../../telemetry/events';
import { runPart } from './collection';

export const LOG_COVERAGE_WINDOW_HOURS = 12;
export const DEFAULT_LOG_COVERAGE_TARGET_DOCS = 50_000;
export const MIN_LOG_COVERAGE_TARGET_DOCS = 1_000;
const INDEX_PATTERNS_TIMEOUT_MS = 10_000;
const COUNT_TIMEOUT_MS = 10_000;
const SAMPLE_TIMEOUT_MS = 30_000;
const MIN_SAMPLE_RATE = 0.0001;
const MAX_SOURCES = 30;
const TARGET_DOCS_GROWTH = 1.5;
const MISSING_SOURCE = 'unknown';

const WINDOW_FILTER = `@timestamp >= NOW() - ${LOG_COVERAGE_WINDOW_HOURS} hours`;

type LogCoverageOutcome = LogCoverageEventPayload['outcome'];

interface EsqlResponseWithPartial {
  columns: Array<{ name: string }>;
  values: unknown[][];
  is_partial?: boolean;
}

/** Fraction of the window's logs to read so the sample holds about `targetDocs` documents. */
export const computeSampleRate = (targetDocs: number, totalDocs: number): number => {
  if (totalDocs <= 0) return 1;
  const rate = Math.min(1, Math.max(MIN_SAMPLE_RATE, targetDocs / totalDocs));
  return Math.max(MIN_SAMPLE_RATE, roundSampleProbability(rate));
};

/** Halves the sample size after a timeout and grows it back after a success. */
export const nextTargetDocs = (current: number, outcome: LogCoverageOutcome): number => {
  if (outcome === 'timed_out') {
    return Math.max(MIN_LOG_COVERAGE_TARGET_DOCS, Math.floor(current / 2));
  }
  if (outcome === 'complete') {
    return Math.min(DEFAULT_LOG_COVERAGE_TARGET_DOCS, Math.round(current * TARGET_DOCS_GROWTH));
  }
  return current;
};

/**
 * The user creation rule, per document: a document can make a new user entity when it passes the
 * identity filter and is either a local user or an asset event. It leaves out the arm that keeps
 * users already in the store, since the probe doesn't look them up.
 */
const buildUserCreationCondition = (identityDocumentsFilter: Condition): Condition => ({
  and: [
    identityDocumentsFilter,
    {
      or: [
        { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
        { field: 'event.kind', includes: 'asset' },
      ],
    },
  ],
});

const countWhen = (condition: Condition): string => `COUNT(CASE(${conditionToESQL(condition)}, 1))`;

export const buildLogCoverageSampleQuery = ({
  indexPatterns,
  sampleRate,
  excludedUserNames,
}: {
  indexPatterns: string[];
  sampleRate: number;
  excludedUserNames: string[];
}): string => {
  const definition = getBuiltInEntityDefinition('user', undefined, { excludedUserNames });
  const { identityField } = definition;
  if (isSingleFieldIdentity(identityField)) {
    throw new Error('The user definition must use a multi-field identity');
  }

  const evaluations = [
    getFieldEvaluationsEsql(definition),
    ...(identityField.fieldEvaluations ?? []).map(buildOneFieldEvaluationEsql),
  ].filter(Boolean);
  const sample = sampleRate < 1 ? `\n  | SAMPLE ${sampleRate}` : '';

  return `${NULLIFY_UNMAPPED_FIELDS_SETTING}
FROM ${indexPatterns.join(', ')}
  | WHERE ${WINDOW_FILTER}${sample}
  | EVAL ${evaluations.join(',\n ')}
  | STATS
      sampledDocs = COUNT(*),
      withUserName = ${countWhen(isNotEmptyCondition('user.name'))},
      withUserEmail = ${countWhen(isNotEmptyCondition('user.email'))},
      withUserId = ${countWhen(isNotEmptyCondition('user.id'))},
      withHostId = ${countWhen(isNotEmptyCondition('host.id'))},
      withHostName = ${countWhen(isNotEmptyCondition('host.name'))},
      matchesCreationRule = ${countWhen(buildUserCreationCondition(identityField.documentsFilter))}
    BY entity.source
  | SORT sampledDocs DESC
  | LIMIT ${MAX_SOURCES}`;
};

const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);

const toSources = ({
  columns,
  values,
}: EsqlResponseWithPartial): NonNullable<LogCoverageEventPayload['sources']> =>
  values.map((row) => {
    const read = (name: string) => row[columns.findIndex((column) => column.name === name)];
    const source = read('entity.source');
    return {
      source: typeof source === 'string' && source !== '' ? source : MISSING_SOURCE,
      sampledDocs: asNumber(read('sampledDocs')),
      withUserName: asNumber(read('withUserName')),
      withUserEmail: asNumber(read('withUserEmail')),
      withUserId: asNumber(read('withUserId')),
      withHostId: asNumber(read('withHostId')),
      withHostName: asNumber(read('withHostName')),
      matchesCreationRule: asNumber(read('matchesCreationRule')),
    };
  });

export interface LogCoverageResult {
  event: Omit<LogCoverageEventPayload, 'namespace'>;
  /** Sample size for the next run, stored in the task state. */
  nextTargetDocs: number;
}

interface CollectLogCoverageParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Local index patterns that extraction reads from; resolves to nothing when not installed. */
  getIndexPatterns: () => Promise<string[]>;
  excludedUserNames: string[];
  targetDocs: number;
  signal: AbortSignal;
  deadline: number;
}

const untilAborted = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });

/**
 * Samples the last 12h of logs and counts, per source, which identity fields the logs carry and
 * whether they could create a user entity. It never throws: every outcome becomes an event, so a
 * slow or failing probe still shows up in the data.
 */
export const collectLogCoverage = async ({
  esClient,
  logger,
  getIndexPatterns,
  excludedUserNames,
  targetDocs,
  signal,
  deadline,
}: CollectLogCoverageParams): Promise<LogCoverageResult> => {
  const start = Date.now();
  const finish = (
    outcome: LogCoverageOutcome,
    details: Partial<Omit<LogCoverageEventPayload, 'namespace' | 'outcome'>> = {}
  ): LogCoverageResult => ({
    event: {
      outcome,
      windowHours: LOG_COVERAGE_WINDOW_HOURS,
      durationMs: Date.now() - start,
      ...details,
    },
    nextTargetDocs: nextTargetDocs(targetDocs, outcome),
  });

  try {
    // `getIndexPatterns` takes no signal, so stop waiting for it once the part is aborted.
    const patternsResult = await runPart({
      part: 'logIndexPatterns',
      timeoutMs: INDEX_PATTERNS_TIMEOUT_MS,
      deadline,
      taskSignal: signal,
      fn: (partSignal) =>
        untilAborted(
          getIndexPatterns().catch((e) => {
            logger.warn(`Failed to resolve log coverage index patterns: ${e}`);
            throw e;
          }),
          partSignal
        ),
    });
    if (!patternsResult.result) return finish(patternsResult.outcome);
    if (patternsResult.result.length === 0) return finish('skipped');
    const indexPatterns = withInternalEsqlViewExclusions(patternsResult.result);

    const countResult = await runPart({
      part: 'logCount',
      timeoutMs: COUNT_TIMEOUT_MS,
      deadline,
      taskSignal: signal,
      fn: async (partSignal) => {
        const response = (await executeEsqlQuery({
          esClient,
          query: `FROM ${indexPatterns.join(', ')}
  | WHERE ${WINDOW_FILTER}
  | STATS totalDocs = COUNT(*)`,
          signal: partSignal,
        })) as EsqlResponseWithPartial;
        return { totalDocs: asNumber(response.values[0]?.[0]), isPartial: !!response.is_partial };
      },
    });
    if (!countResult.result) return finish(countResult.outcome);

    const { totalDocs, isPartial: countIsPartial } = countResult.result;
    if (totalDocs === 0) {
      return finish(countIsPartial ? 'partial' : 'complete', {
        totalDocs,
        sampleRate: 1,
        sampledDocs: 0,
        sources: [],
      });
    }

    const sampleRate = computeSampleRate(targetDocs, totalDocs);
    const sampleResult = await runPart({
      part: 'logSample',
      timeoutMs: SAMPLE_TIMEOUT_MS,
      deadline,
      taskSignal: signal,
      fn: async (partSignal) =>
        (await executeEsqlQuery({
          esClient,
          query: buildLogCoverageSampleQuery({ indexPatterns, sampleRate, excludedUserNames }),
          signal: partSignal,
        })) as EsqlResponseWithPartial,
    });
    if (!sampleResult.result) return finish(sampleResult.outcome, { totalDocs, sampleRate });

    const sources = toSources(sampleResult.result);
    return finish(countIsPartial || sampleResult.result.is_partial ? 'partial' : 'complete', {
      totalDocs,
      sampleRate,
      sampledDocs: sources.reduce((sum, { sampledDocs }) => sum + sampledDocs, 0),
      sources,
    });
  } catch (e) {
    logger.warn(`Failed to collect log coverage telemetry: ${e}`);
    return finish('failed');
  }
};
