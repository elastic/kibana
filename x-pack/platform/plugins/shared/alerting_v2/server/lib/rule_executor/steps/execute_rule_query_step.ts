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
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { getQueryPayload } from '../get_query_payload';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceScopedSpaceRoutingToken } from '../../services/query_service/tokens';
import { guardedExpandStep, withAtLeastOne } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS, type RuleExecutionCounter } from '../metrics/counters';
import { type PluginConfig, getQueryRowLimit } from '../../../config';

type EsqlRowBatch = Record<string, unknown>[];

@injectable()
export class ExecuteRuleQueryStep implements RuleExecutionStep {
  public readonly name = 'execute_rule_query';

  private readonly queryRowLimit: number;
  private readonly maxQueryResponseSize: number;

  constructor(
    @inject(QueryServiceScopedSpaceRoutingToken)
    private readonly queryService: QueryServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    const config = pluginConfigAccessor.get<PluginConfig>();
    this.queryRowLimit = getQueryRowLimit(config);
    this.maxQueryResponseSize = config.rules.run.query.maxResponseSize;
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

      const boundedQuery = appendLimitToQuery(effectiveQuery, step.queryRowLimit);

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
        });

        let totalRows = 0;
        let loggedRowsDropped = false;

        for await (const batch of withAtLeastOne<EsqlRowBatch>(esqlRowBatchStream, [])) {
          totalRows += batch.length;

          const counters: Partial<Record<RuleExecutionCounter, number>> = {
            [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: batch.length,
          };

          if (!loggedRowsDropped && totalRows >= step.queryRowLimit) {
            loggedRowsDropped = true;
            counters[RULE_EXECUTION_COUNTERS.rowsDroppedByLimit] = 1;
            logger.debug({
              message: `ES|QL query results truncated at the ${step.queryRowLimit}-row limit; some rows may have been dropped`,
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
        if (isMaximumResponseSizeExceededError(error) || isEsqlUserError(error)) {
          throw createTaskRunError(error as Error, TaskErrorSource.USER);
        }
        throw error;
      }
    });
  }
}
