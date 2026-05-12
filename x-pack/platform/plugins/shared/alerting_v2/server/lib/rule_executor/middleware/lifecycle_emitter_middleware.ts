/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleExecutionMiddleware, RuleExecutionMiddlewareContext } from './types';
import type { PipelineStateStream } from '../types';
import { emitEvent } from '../events';
import type { StepCompletedEvent, StepStartedEvent } from '../events';
import type { ExecutionContext } from '../../execution_context';

/**
 * Middleware that emits per-step lifecycle events into the observer hub.
 *
 * Each wrapped step yields one `step_started` (when the wrapper enters its
 * iteration) and one `step_completed` (when iteration finishes successfully).
 * Failures are reported through the terminal `execution_failed` event from
 * the task runner — we don't emit a `step_failed` here to keep the union
 * narrow and avoid double-reporting.
 *
 * `executionUuid` is read from the first state that flows through, which is
 * the same uuid the task runner minted before invoking the pipeline.
 */
@injectable()
export class LifecycleEmitterMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'lifecycle_emitter';

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const stream = next(input);
    const stepName = ctx.step.name;

    return (async function* () {
      let executionContext: ExecutionContext | undefined;
      let executionUuid = '';
      const startedAt = Date.now();

      for await (const result of stream) {
        if (executionContext == null) {
          executionContext = result.state.input.executionContext;
          executionUuid = result.state.input.executionUuid;

          emitEvent<StepStartedEvent>(executionContext, executionUuid, {
            kind: 'step_started',
            step: stepName,
          });
        }

        yield result;
      }

      if (executionContext != null) {
        emitEvent<StepCompletedEvent>(executionContext, executionUuid, {
          kind: 'step_completed',
          step: stepName,
          durationMs: Date.now() - startedAt,
        });
      }
    })();
  }
}
