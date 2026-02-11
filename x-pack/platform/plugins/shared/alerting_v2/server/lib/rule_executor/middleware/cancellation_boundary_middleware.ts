/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleExecutionMiddleware, RuleExecutionMiddlewareContext } from './types';
import type { PipelineStateStream } from '../types';

/**
 * Global middleware that enforces cancellation checks at step boundaries.
 *
 * Wraps both input and output streams of every step so that:
 * - Cancellation is detected before a step receives data.
 * - Cancellation is detected after a step yields data.
 *
 * Steps and stream helpers (pipeStream, etc.) do NOT need to check
 * cancellation themselves — this middleware handles it centrally.
 */
@injectable()
export class CancellationBoundaryMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'cancellation_boundary';

  public execute(
    _ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const guardedInput = this.guardStream(input);
    const output = next(guardedInput);
    return this.guardStream(output);
  }

  private guardStream(stream: PipelineStateStream): PipelineStateStream {
    return (async function* () {
      for await (const result of stream) {
        if (result.type === 'continue') {
          result.state.input.executionContext.throwIfAborted();
        }

        yield result;

        if (result.type === 'halt') {
          return;
        }
      }
    })();
  }
}
