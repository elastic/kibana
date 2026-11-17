/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { getBreachEsqlQuery } from '@kbn/alerting-v2-schemas';
import { appendLimitToQuery } from '@kbn/esql-utils';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import { isEsqlUserError } from '../../errors/esql_user_error';
import { toQueryResponseSizeExceededError } from '../../errors/query_response_size_exceeded_error';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { getQueryPayload } from '../get_query_payload';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceScopedSpaceRoutingToken } from '../../services/query_service/tokens';
import type { EsqlResponseFormatServiceContract } from '../../services/esql_response_format_service/esql_response_format_service';
import { EsqlResponseFormatServiceToken } from '../../services/esql_response_format_service/tokens';
import { guardedExpandStep, withAtLeastOne } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS, type RuleExecutionCounter } from '../metrics/counters';
import { getQueryRowLimit } from '../../../config';
import { ConfigService } from '../../services/config_service/config_service';

type EsqlRowBatch = Record<string, unknown>[];

@injectable()
export class ExecuteRuleQueryStep implements RuleExecutionStep {
  public readonly name = 'execute_rule_query';

  private readonly maxQueryResponseSize: number;
  private readonly maxAlerts: number;

  constructor(
    @inject(QueryServiceScopedSpaceRoutingToken)
    private readonly queryService: QueryServiceContract,
    @inject(EsqlResponseFormatServiceToken)
    private readonly esqlResponseFormatService: EsqlResponseFormatServiceContract,
    @inject(ConfigService) configService: ConfigService
  ) {
    this.maxQueryResponseSize = configService
      .get('rules.run.query.maxResponseSize')
      .getValueInBytes();
    this.maxAlerts = configService.get('rules.run.alerts.max');
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule'], async function* (state) {
      const { input, rule } = state;
      const logger = state.logger.withLabels({ step: step.name });

      const effectiveQuery = getBreachEsqlQuery(rule.query);
      const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;
      const timeField = rule.time_field;

      const queryPayload = getQueryPayload({
        query: effectiveQuery,
        timeField,
        lookbackWindow,
      });

      // Snapshot once so the LIMIT appended to the query and the transport
      // chosen by QueryService are always derived from the same flag value.
      const format = step.esqlResponseFormatService.get();
      const queryRowLimit = getQueryRowLimit(step.maxAlerts, format);
      const boundedQuery = appendLimitToQuery(effectiveQuery, queryRowLimit);

      logger.debug({
        message: 'Executing ES|QL query',
        labels: { rule_id: input.ruleId, step: step.name },
      });

      try {
        // Streamed batches live outside the V8 heap, where Task Manager cannot see
        // them: report what has been received so far, and once the first batch has
        // shown the row size, reserve what the row limit could still bring.
        const { memory } = input;
        let bytesReceived = 0;
        let reserved = false;
        const esqlRowBatchStream = step.queryService.executeQueryStream({
          query: boundedQuery,
          filter: queryPayload.filter,
          params: queryPayload.params,
          abortSignal: input.executionContext.signal,
          maxResponseSize: step.maxQueryResponseSize,
          format,
          ...(memory
            ? {
                onBytes: (bytes: number) => {
                  bytesReceived += bytes;
                  memory.report(bytesReceived);
                },
              }
            : {}),
        });

        let totalRows = 0;
        let loggedRowsDropped = false;

        for await (const batch of withAtLeastOne<EsqlRowBatch>(esqlRowBatchStream, [])) {
          totalRows += batch.length;
          if (memory && !reserved && bytesReceived > 0 && totalRows > 0) {
            reserved = true;
            memory.reserve(
              Math.min(
                step.maxQueryResponseSize,
                Math.ceil((bytesReceived / totalRows) * queryRowLimit)
              )
            );
          }

          const counters: Partial<Record<RuleExecutionCounter, number>> = {
            [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: batch.length,
          };

          if (!loggedRowsDropped && totalRows >= queryRowLimit) {
            loggedRowsDropped = true;
            counters[RULE_EXECUTION_COUNTERS.rowsDroppedByLimit] = 1;
            logger.debug({
              message: `ES|QL query results truncated at the ${queryRowLimit}-row limit; some rows may have been dropped`,
              labels: { rule_id: input.ruleId, step: step.name },
            });
          }

          yield {
            type: 'continue',
            state: { ...state, queryPayload, esqlRowBatch: batch },
            meta: { counters },
          };
        }
      } catch (error) {
        if (isMaximumResponseSizeExceededError(error)) {
          const sizeError = toQueryResponseSizeExceededError(
            error,
            'breach',
            step.maxQueryResponseSize
          );
          logger.warn({
            message: sizeError.message,
            code: ALERTING_LOG_CODES.RULE_EXECUTION_QUERY_RESPONSE_SIZE_EXCEEDED,
            labels: { rule_id: input.ruleId, space_id: input.spaceId, step: step.name },
          });
          throw createTaskRunError(sizeError, TaskErrorSource.USER);
        }
        if (isEsqlUserError(error)) {
          throw createTaskRunError(error as Error, TaskErrorSource.USER);
        }
        throw error;
      }
    });
  }
}
