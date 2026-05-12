/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleExecutionMiddleware, RuleExecutionMiddlewareContext } from './types';
import type { PipelineStateStream, RulePipelineState } from '../types';
import { isRuleExecutionCancellationError } from '../../execution_context';
import { emitEvent } from '../events';
import type { StepCancelledEvent } from '../events';

/**
 * Global middleware that enforces cancellation checks at step boundaries.
 *
 * Wraps both input and output streams of every step so that:
 * - Cancellation is detected before a step receives data.
 * - Cancellation is detected after a step yields data.
 *
 * When a cancellation does fire, the middleware emits a `step_cancelled`
 * event carrying the name of the step that was running. The
 * `TelemetryObserver` consumes that event to populate the
 * `metrics.cancelled.{step,reason}` channel on the `execute` event-log
 * document so the operator dashboard can answer "which step was cancelled?".
 */
@injectable()
export class CancellationBoundaryMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'cancellation_boundary';

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const guardedInput = this.guardStream(input, ctx.step.name);
    const output = next(guardedInput);
    return this.guardStream(output, ctx.step.name);
  }

  private guardStream(stream: PipelineStateStream, stepName: string): PipelineStateStream {
    return (async function* () {
      for await (const result of stream) {
        if (result.type === 'continue') {
          try {
            result.state.input.executionContext.throwIfAborted();
          } catch (error) {
            if (isRuleExecutionCancellationError(error)) {
              emitStepCancelled(result.state, stepName);
            }
            throw error;
          }
        }

        yield result;

        if (result.type === 'halt') {
          return;
        }
      }
    })();
  }
}

const emitStepCancelled = (state: RulePipelineState, stepName: string): void => {
  emitEvent<StepCancelledEvent>(state.input.executionContext, state.input.executionUuid, {
    kind: 'step_cancelled',
    step: stepName,
    reason: 'cancelled_timeout',
  });
};
