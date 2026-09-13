/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import { isEsqlUserError } from '../errors/esql_user_error';
import { toQueryResponseSizeExceededError } from '../errors/query_response_size_exceeded_error';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import type { RuleExecutionInput } from './types';
import { buildQueryRecoveryAlertEvents, resolveAlertEventType } from './build_alert_events';
import { getQueryPayload } from './get_query_payload';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import type { QueryServiceContract } from '../services/query_service/query_service';
import type { ActiveAlertGroupHash } from './queries';
import type { RuleResponse } from '../rules_client';
import type { AlertEvent } from '../../resources/datastreams/alert_events';

/**
 * Runs the rule's recovery ES|QL query and builds `recovered` events for the
 * matching active groups.
 *
 * Pure helper lifted from the former `CreateRecoveryEventsStep`. Breach always
 * wins: groups present in the full-run breach set are excluded even when the
 * recovery query also matched them.
 */
export const executeRecoveryQuery = async ({
  queryService,
  logger,
  rule,
  effectiveQuery,
  input,
  activeGroupHashes,
  breachedGroupHashes,
  maxResponseSize,
}: {
  queryService: QueryServiceContract;
  logger: LoggerServiceContract;
  rule: RuleResponse;
  effectiveQuery: string;
  input: RuleExecutionInput;
  activeGroupHashes: ActiveAlertGroupHash[];
  breachedGroupHashes: ReadonlySet<string>;
  maxResponseSize?: number;
}): Promise<AlertEvent[]> => {
  const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;

  const queryPayload = getQueryPayload({
    query: effectiveQuery,
    timeField: rule.time_field,
    lookbackWindow,
  });

  logger.debug({
    message: 'Executing recovery query',
    labels: { rule_id: input.ruleId },
  });

  try {
    const esqlResponse = await queryService.executeQuery({
      query: effectiveQuery,
      filter: queryPayload.filter,
      params: queryPayload.params,
      abortSignal: input.executionContext.signal,
      maxResponseSize,
    });

    return buildQueryRecoveryAlertEvents({
      ruleId: rule.id,
      ruleVersion: rule.metadata.version,
      spaceId: input.spaceId,
      ruleAttributes: rule,
      activeGroupHashes,
      breachedGroupHashes,
      esqlResponse,
      scheduledTimestamp: input.scheduledAt,
      type: resolveAlertEventType(rule),
    });
  } catch (error) {
    if (isMaximumResponseSizeExceededError(error)) {
      const sizeError = toQueryResponseSizeExceededError(error, 'recovery', maxResponseSize);
      logger.warn({
        message: `Recovery query: ${sizeError.message}`,
        code: ALERTING_LOG_CODES.RULE_EXECUTION_QUERY_RESPONSE_SIZE_EXCEEDED,
        labels: { rule_id: input.ruleId, space_id: input.spaceId },
      });
      throw createTaskRunError(sizeError, TaskErrorSource.USER);
    }
    if (isEsqlUserError(error)) {
      throw createTaskRunError(error as Error, TaskErrorSource.USER);
    }
    throw error;
  }
};
