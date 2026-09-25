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
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import { isEsqlUserError } from '../../errors/esql_user_error';
import { toQueryResponseSizeExceededError } from '../../errors/query_response_size_exceeded_error';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { getQueryPayload } from '../get_query_payload';
import { getMvExpandFields, injectDeduplicationMetadata } from '../deduplication_query';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceScopedSpaceRoutingToken } from '../../services/query_service/tokens';
import type { EsqlResponseFormatServiceContract } from '../../services/esql_response_format_service/esql_response_format_service';
import { EsqlResponseFormatServiceToken } from '../../services/esql_response_format_service/tokens';
import { guardedExpandStep, withAtLeastOne } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS, type RuleExecutionCounter } from '../metrics/counters';
import { type PluginConfig, getQueryRowLimit } from '../../../config';

type EsqlRowBatch = Record<string, unknown>[];

@injectable()
export class ExecuteRuleQueryStep implements RuleExecutionStep {
  public readonly name = 'execute_rule_query';

  private readonly pluginConfig: PluginConfig;
  private readonly maxQueryResponseSize: number;

  constructor(
    @inject(QueryServiceScopedSpaceRoutingToken)
    private readonly queryService: QueryServiceContract,
    @inject(EsqlResponseFormatServiceToken)
    private readonly esqlResponseFormatService: EsqlResponseFormatServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.pluginConfig = pluginConfigAccessor.get<PluginConfig>();
    this.maxQueryResponseSize = this.pluginConfig.rules.run.query.maxResponseSize.getValueInBytes();
  }

  /**
   * Second stage of the query pipeline (`breach query -> dedup metadata ->
   * row limit`): rewrites a non-aggregating query so each row carries
   * `_id`, `_index` and `_version`, the identity `resolveRuleEventId` hashes
   * downstream. See `injectDeduplicationMetadata` for the exact rewrite.
   *
   * This is the executor's only deviation from the stored rule query, and it
   * lives here rather than in `getBreachEsqlQuery` because that helper is
   * shared with the UI and agent-builder, which must show the query as the
   * author wrote it.
   *
   * Failure is contained: if the AST rewrite throws, the original query runs
   * and `RULE_EXECUTION_DEDUP_METADATA_INJECTION_FAILED` is logged. The run
   * then behaves as it did before deduplication existed — every re-match is
   * written — which is preferable to failing the rule execution.
   */
  private withDeduplicationMetadata(query: string, logger: LoggerServiceContract): string {
    try {
      return injectDeduplicationMetadata(query);
    } catch (error) {
      logger.warn({
        code: ALERTING_LOG_CODES.RULE_EXECUTION_DEDUP_METADATA_INJECTION_FAILED,
        message:
          'Could not inject deduplication metadata into the rule query. Executing the original query.',
        error,
      });
      return query;
    }
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule'], async function* (state) {
      const { input, rule } = state;
      const logger = state.logger.withLabels({ step: step.name });

      const breachQuery = getBreachEsqlQuery(rule.query);
      const effectiveQuery = step.withDeduplicationMetadata(breachQuery, logger);
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
      const queryRowLimit = getQueryRowLimit(step.pluginConfig, format);
      const boundedQuery = appendLimitToQuery(effectiveQuery, queryRowLimit);
      const mvExpandFields = getMvExpandFields(effectiveQuery);

      logger.debug({
        message: 'Executing ES|QL query',
        labels: { rule_id: input.ruleId, step: step.name },
      });

      try {
        const esqlRowBatchStream = step.queryService.executeQueryStream({
          query: boundedQuery,
          filter: queryPayload.filter,
          params: queryPayload.params,
          abortSignal: input.executionContext.signal,
          maxResponseSize: step.maxQueryResponseSize,
          format,
        });

        let totalRows = 0;
        let loggedRowsDropped = false;

        for await (const batch of withAtLeastOne<EsqlRowBatch>(esqlRowBatchStream, [])) {
          totalRows += batch.length;

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
            state: { ...state, queryPayload, esqlRowBatch: batch, mvExpandFields },
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
