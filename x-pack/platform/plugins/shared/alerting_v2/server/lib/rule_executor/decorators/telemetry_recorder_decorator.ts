/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { inject, injectable } from 'inversify';
import { isStepExecutionError } from '../middleware';
import { isRuleExecutionCancellationError } from '../../execution_context';
import { EventLogServiceToken } from '../../services/event_log_service/tokens';
import type { EventLogServiceContract } from '../../services/event_log_service/event_log_service';
import type {
  RuleAttributesSnapshot,
  RuleExecuteLogInput,
} from '../../services/event_log_service/rule_executor_log_inputs';
import { ExecutionMetricsCollector } from '../metrics';
import type { RulePipelineState } from '../types';
import type {
  RuleExecutionPipelineContract,
  RuleExecutionPipelineInput,
  RuleExecutionPipelineResult,
} from '../execution_pipeline';
import type { RuleExecutionPipelineDecorator } from './types';
import { mapOutcome } from './map_outcome';

/**
 * Pipeline decorator that emits the rule executor's execute-start /
 * execute event-log documents.
 *
 * Owns the per-run telemetry concerns:
 * - Generates the `executionUuid` immediately after task pickup.
 * - Constructs an {@link ExecutionMetricsCollector} and threads it into the
 *   pipeline (via {@link RuleExecutionPipelineInput.metrics}) so steps and
 *   services can record metrics through their `executionContext.metrics`
 *   slice without ever importing this decorator.
 * - Maps the pipeline outcome to the page-facing `(status, reason)` pair.
 * - Calls `EventLogService.logRuleExecuteStart` / `logRuleExecute`
 *   (fire-and-forget — no await, no throw).
 */
@injectable()
export class TelemetryRecorderDecorator implements RuleExecutionPipelineDecorator {
  public readonly name = 'telemetry_recorder';

  constructor(@inject(EventLogServiceToken) private readonly eventLog: EventLogServiceContract) {}

  public wrap(inner: RuleExecutionPipelineContract): RuleExecutionPipelineContract {
    const eventLog = this.eventLog;

    return {
      async execute(input: RuleExecutionPipelineInput): Promise<RuleExecutionPipelineResult> {
        // The decorator owns the executionUuid: it is a telemetry concern, and
        // the issue's "after task pickup" requirement is satisfied because this
        // wrapper runs first when task_runner.ts calls pipeline.execute().
        const executionUuid = input.executionUuid ?? uuidV4();
        const collector = new ExecutionMetricsCollector();
        const start = new Date();

        eventLog.logRuleExecuteStart({
          executionUuid,
          ruleId: input.ruleId,
          spaceId: input.spaceId,
          start,
        });

        let result: RuleExecutionPipelineResult | undefined;
        let thrown: unknown;

        try {
          result = await inner.execute({
            ...input,
            executionUuid,
            metrics: collector.recorders,
          });
          return result;
        } catch (error) {
          thrown = error;
          throw error;
        } finally {
          const end = new Date();
          const { status, reason } = mapOutcome({ result, error: thrown });
          const ruleAttributes = extractRuleAttributes(result?.finalState);
          const errorPayload = thrown != null ? toErrorPayload(thrown) : undefined;

          const summary: RuleExecuteLogInput = {
            executionUuid,
            ruleId: input.ruleId,
            spaceId: input.spaceId,
            start,
            end,
            status,
            reason,
            error: errorPayload,
            metrics: collector.snapshot(),
            rule: ruleAttributes,
          };

          eventLog.logRuleExecute(summary);
        }
      },
    };
  }
}

const extractRuleAttributes = (
  finalState: RulePipelineState | undefined
): RuleAttributesSnapshot | undefined => {
  if (finalState?.rule == null) {
    return undefined;
  }

  const { rule } = finalState;
  const queries = collectRuleQueries(rule);

  return {
    id: rule.id,
    name: rule.metadata?.name,
    kind: rule.kind,
    // RuleResponse has no version field surfaced on the executor side yet;
    // the future revision step can populate it on the pipeline state and we
    // read it here.
    tags: rule.metadata?.tags,
    ...(queries.length > 0 ? { query: queries } : {}),
  };
};

const collectRuleQueries = (rule: {
  evaluation?: { query?: { base?: string } };
  recovery_policy?: { query?: { base?: string } };
}): string[] => {
  const queries: string[] = [];
  if (rule.evaluation?.query?.base) {
    queries.push(rule.evaluation.query.base);
  }
  if (rule.recovery_policy?.query?.base) {
    queries.push(rule.recovery_policy.query.base);
  }
  return queries;
};

const toErrorPayload = (error: unknown): { message: string; stackTrace?: string } => {
  if (isRuleExecutionCancellationError(error)) {
    return { message: error.message, stackTrace: error.stack };
  }
  if (isStepExecutionError(error)) {
    const cause = error.cause;
    if (cause instanceof Error) {
      return { message: cause.message, stackTrace: cause.stack };
    }
    return { message: error.message, stackTrace: error.stack };
  }
  if (error instanceof Error) {
    return { message: error.message, stackTrace: error.stack };
  }
  return { message: String(error) };
};
