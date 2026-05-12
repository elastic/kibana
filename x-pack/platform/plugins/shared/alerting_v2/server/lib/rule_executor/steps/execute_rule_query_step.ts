/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { getQueryPayload } from '../get_query_payload';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceScopedToken } from '../../services/query_service/tokens';
import { guardedExpandStep } from '../stream_utils';

/**
 * Returns the query to execute for this rule.
 *
 * Uses `evaluation.query.base` which contains the full ES|QL query
 * including any trigger condition (e.g. a trailing WHERE clause).
 */
function buildEffectiveQuery(evaluationQuery: { base: string }): string {
  return evaluationQuery.base.trimEnd();
}

@injectable()
export class ExecuteRuleQueryStep implements RuleExecutionStep {
  public readonly name = 'execute_rule_query';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceScopedToken) private readonly queryService: QueryServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule'], async function* (state) {
      const { input, rule } = state;

      const effectiveQuery = buildEffectiveQuery(rule.evaluation.query);
      const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;
      const timeField = rule.time_field;

      const queryPayload = getQueryPayload({
        query: effectiveQuery,
        timeField,
        lookbackWindow,
      });

      step.logger.debug({
        message: () =>
          `[${step.name}] Executing ES|QL query for rule ${input.ruleId} - ${JSON.stringify({
            query: effectiveQuery,
            filter: queryPayload.filter,
            params: queryPayload.params,
          })}`,
      });

      const esqlRowBatchStream = step.queryService.executeQueryStream({
        query: effectiveQuery,
        filter: queryPayload.filter,
        params: queryPayload.params,
        abortSignal: input.executionContext.signal,
      });

      // Telemetry is owned by the step, not the service: QueryService is a
      // generic ES|QL client and must not depend on rule-executor concepts.
      // We measure wall-clock around the stream and tally rows/batches as we
      // iterate. ES `took` is not surfaced for arrow streams, so we report
      // wall-clock as the proxy for `es_search_duration_ms`.
      const queryMetrics = input.executionContext.metrics.query;
      const startedAt = Date.now();
      let rowCount = 0;
      let yielded = false;

      for await (const batch of esqlRowBatchStream) {
        yielded = true;
        rowCount += batch.length;
        queryMetrics.recordBatch();
        yield {
          type: 'continue',
          state: { ...state, queryPayload, esqlRowBatch: batch },
        };
      }

      if (!yielded) {
        yield {
          type: 'continue',
          state: { ...state, queryPayload, esqlRowBatch: [] },
        };
      }

      const durationMs = Date.now() - startedAt;
      queryMetrics.recordSearch({ esTookMs: durationMs, durationMs, rowCount });
    });
  }
}
