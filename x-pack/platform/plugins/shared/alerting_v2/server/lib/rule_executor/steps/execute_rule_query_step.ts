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
import { emitEvent } from '../events';
import type { BatchProcessedEvent, QueryExecutedEvent } from '../events';

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

      // The step emits domain events about what happened — the QueryService
      // is a generic ES|QL client and stays free of rule-executor concepts.
      // We measure wall-clock around the stream and emit one
      // `batch_processed` per yield + a single `query_executed` summary
      // when the stream completes. Consumers (telemetry observer today,
      // others tomorrow) decide what to do with the data.
      const startedAt = Date.now();
      let rowCount = 0;
      let yielded = false;

      for await (const batch of esqlRowBatchStream) {
        yielded = true;
        rowCount += batch.length;
        emitEvent<BatchProcessedEvent>(input.executionContext, input.executionUuid, {
          kind: 'batch_processed',
          step: step.name,
          rowCount: batch.length,
        });
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
      // ES `took` is not surfaced for arrow streams, so wall-clock acts as
      // the proxy for `es_search_duration_ms`.
      emitEvent<QueryExecutedEvent>(input.executionContext, input.executionUuid, {
        kind: 'query_executed',
        step: step.name,
        esTookMs: durationMs,
        durationMs,
        rowCount,
      });
    });
  }
}
