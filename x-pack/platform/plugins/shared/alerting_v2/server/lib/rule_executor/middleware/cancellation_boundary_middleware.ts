/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleExecutionMiddleware, RuleExecutionMiddlewareContext } from './types';
import type { PipelineStateStream } from '../types';
import { identifyErrorWithStepName } from '../step_error';

/**
 * Global middleware that enforces cancellation checks at step boundaries.
 *
 * Wraps both input and output streams of every step so that:
 * - Cancellation is detected before a step receives data.
 * - Cancellation is detected after a step yields data.
 *
 * Cancellation errors are tagged with the current step name so the task
 * runner can populate `cancelled.step` in the execute summary.
 */
@injectable()
export class CancellationBoundaryMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'cancellation_boundary';

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const guardedInput = this.guardStream(input, ctx);
    const output = next(guardedInput);
    return this.guardStream(output, ctx);
  }

  private guardStream(
    stream: PipelineStateStream,
    ctx: RuleExecutionMiddlewareContext
  ): PipelineStateStream {
    return (async function* () {
      try {
        for await (const result of stream) {
          if (result.type === 'continue') {
            result.state.input.executionContext.throwIfAborted();
          }

          yield result;

          if (result.type === 'halt') {
            return;
          }
        }
      } catch (error) {
        throw identifyErrorWithStepName(error, ctx.step.name);
      }
    })();
  }
}
