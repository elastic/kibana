/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import { stableStringify } from '@kbn/std';
import { getNoDataEsqlQuery } from '@kbn/alerting-v2-schemas';
import { isEsqlUserError } from '../errors/esql_user_error';
import type { RuleExecutionInput } from './types';
import { buildExecutionUuid, buildGroupHash } from './build_alert_events';
import { getQueryPayload } from './get_query_payload';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import type { QueryServiceContract } from '../services/query_service/query_service';
import type { RuleResponse } from '../rules_client';

/**
 * Runs the rule's no_data ES|QL query once and returns the set of group hashes
 * that still have data.
 *
 * Pure, single-query helper lifted from the former `DetectDataPresenceStep` so
 * the end-of-stream classifier can run data-presence detection exactly once per
 * run (rather than once per streamed batch). Returns an empty set when the rule
 * has no resolvable no_data query (e.g. `no_data_strategy: 'none'`, or a stale
 * standalone saved object with no `query.no_data` block).
 */
export const detectDataPresence = async ({
  queryService,
  rule,
  input,
  logger,
  maxResponseSize,
}: {
  queryService: QueryServiceContract;
  rule: RuleResponse;
  input: RuleExecutionInput;
  logger: LoggerServiceContract;
  maxResponseSize?: number;
}): Promise<Set<string>> => {
  const noDataQuery = getNoDataEsqlQuery(rule.query, rule.no_data_strategy);

  if (!noDataQuery) {
    return new Set();
  }

  const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;
  const queryPayload = getQueryPayload({
    query: noDataQuery,
    timeField: rule.time_field,
    lookbackWindow,
  });

  logger.debug({
    message: 'Executing data-presence query',
    labels: { rule_id: input.ruleId },
  });

  try {
    const rows = await queryService.executeQueryRows({
      query: noDataQuery,
      filter: queryPayload.filter,
      params: queryPayload.params,
      abortSignal: input.executionContext.signal,
      maxResponseSize,
    });

    return collectGroupHashesFromRows({ rule, rows, input });
  } catch (error) {
    if (isMaximumResponseSizeExceededError(error) || isEsqlUserError(error)) {
      throw createTaskRunError(error as Error, TaskErrorSource.USER);
    }
    throw error;
  }
};

function collectGroupHashesFromRows({
  rule,
  rows,
  input,
}: {
  rule: RuleResponse;
  rows: Array<Record<string, unknown>>;
  input: RuleExecutionInput;
}): Set<string> {
  const { ruleId, spaceId, scheduledAt } = input;

  if (rows.length === 0) {
    return new Set();
  }

  const groupingFields = rule.grouping?.fields ?? [];
  const executionUuid = buildExecutionUuid({
    ruleId,
    spaceId,
    scheduledTimestamp: scheduledAt,
    suffix: 'no_data',
  });
  const groupHashes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowDoc = rows[i];

    const hash = buildGroupHash({
      rowDoc,
      groupKeyFields: groupingFields,
      get fallbackSeed(): string {
        return `${executionUuid}|row:${i}|${stableStringify(rowDoc)}`;
      },
    });

    groupHashes.add(hash);
  }

  return groupHashes;
}
