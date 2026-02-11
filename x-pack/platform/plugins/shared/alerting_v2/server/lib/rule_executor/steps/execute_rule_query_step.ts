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
import { flatMapStep, requireState } from '../stream_utils';

@injectable()
export class ExecuteRuleQueryStep implements RuleExecutionStep {
  public readonly name = 'execute_rule_query';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceScopedToken) private readonly queryService: QueryServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return flatMapStep(streamState, async function* (state) {
      const { input } = state;

      step.logger.debug({
        message: `[${step.name}] Starting step for rule ${input.ruleId}`,
      });

      const requiredState = requireState(state, ['rule']);

      if (!requiredState.ok) {
        step.logger.debug({ message: `[${step.name}] State not ready, halting` });
        yield requiredState.result;
        return;
      }

      const { rule } = requiredState.state;

      const queryPayload = getQueryPayload({
        query: rule.query,
        timeField: rule.timeField,
        lookbackWindow: rule.lookbackWindow,
      });

      step.logger.debug({
        message: () =>
          `[${step.name}] Executing ES|QL query for rule ${input.ruleId} - ${JSON.stringify({
            query: rule.query,
            filter: queryPayload.filter,
            params: queryPayload.params,
          })}`,
      });

      const esqlRowBatchStream = step.queryService.executeQueryStream({
        query: rule.query,
        filter: queryPayload.filter,
        params: queryPayload.params,
        abortSignal: input.executionContext.signal,
      });

      step.logger.debug({
        message: `[${step.name}] Created streaming query for rule ${input.ruleId}`,
      });

      for await (const batch of esqlRowBatchStream) {
        yield {
          type: 'continue',
          state: { ...requiredState.state, queryPayload, esqlRowBatch: batch },
        };
      }
    });
  }
}
