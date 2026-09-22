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
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import { isEsqlUserError } from '../../errors/esql_user_error';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { getQueryPayload } from '../get_query_payload';
import { injectDeduplicationMetadata } from '../deduplication_query';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceScopedSpaceRoutingToken } from '../../services/query_service/tokens';
import { guardedExpandStep, withAtLeastOne } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import type { PluginConfig } from '../../../config';

type EsqlRowBatch = Record<string, unknown>[];

@injectable()
export class ExecuteRuleQueryStep implements RuleExecutionStep {
  public readonly name = 'execute_rule_query';

  private readonly maxAlertsPerRun: number;

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceScopedSpaceRoutingToken)
    private readonly queryService: QueryServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.maxAlertsPerRun = pluginConfigAccessor.get<PluginConfig>().rules.run.alerts.max;
  }

  /**
   * Non-aggregating queries get `METADATA _id, _index, _version` so each row
   * carries the source-document identity used to deduplicate rule events.
   * A query the parser cannot transform runs unchanged; its rows then have no
   * `_id` and are written without deduplication.
   */
  private withDeduplicationMetadata(query: string, ruleId: string): string {
    try {
      return injectDeduplicationMetadata(query);
    } catch (error) {
      this.logger.warn({
        code: ALERTING_LOG_CODES.RULE_EXECUTION_DEDUP_METADATA_INJECTION_FAILED,
        message: `[${this.name}] Could not inject deduplication metadata into query for rule ${ruleId}. Executing the original query.`,
        error,
      });
      return query;
    }
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule'], async function* (state) {
      const { input, rule } = state;

      const effectiveQuery = step.withDeduplicationMetadata(
        getBreachEsqlQuery(rule.query),
        input.ruleId
      );
      const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;
      const timeField = rule.time_field;

      const queryPayload = getQueryPayload({
        query: effectiveQuery,
        timeField,
        lookbackWindow,
      });

      const boundedQuery = appendLimitToQuery(effectiveQuery, step.maxAlertsPerRun);

      step.logger.debug({
        message: 'Executing ES|QL query',
        labels: { rule_id: input.ruleId, step: step.name },
      });

      try {
        const esqlRowBatchStream = step.queryService.executeQueryStream({
          query: boundedQuery,
          filter: queryPayload.filter,
          params: queryPayload.params,
          abortSignal: input.executionContext.signal,
        });

        for await (const batch of withAtLeastOne<EsqlRowBatch>(esqlRowBatchStream, [])) {
          yield {
            type: 'continue',
            state: { ...state, queryPayload, esqlRowBatch: batch },
            meta: {
              counters: {
                [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: batch.length,
              },
            },
          };
        }
      } catch (error) {
        if (isEsqlUserError(error)) {
          throw createTaskRunError(error as Error, TaskErrorSource.USER);
        }
        throw error;
      }
    });
  }
}
