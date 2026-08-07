/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable, multiInject } from 'inversify';
import type { PipelineStateStream } from '../types';
import type { RuleExecutionMiddleware, RuleExecutionMiddlewareContext } from '../middleware/types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { MetricRecorder } from './types';
import { MetricRecorderToken } from './tokens';

/**
 * Middleware that drives {@link MetricRecorder}s over each step's emissions.
 *
 * Registered as the innermost middleware in the chain so it observes the
 * raw step output (before other middlewares transform it). For every
 * `continue` emission of an observed step, every matching recorder is invoked
 * exactly once with the current state, the ephemeral emission meta, and the
 * running emission index.
 *
 * Recorder failures are caught and logged as warnings — telemetry must never
 * break a rule execution. Genuine step errors still propagate to
 * `ErrorHandlingMiddleware` because the step stream itself is NOT wrapped.
 *
 * At least one recorder is always bound to {@link MetricRecorderToken}
 * (`EmittedCountersRecorder`), so `@multiInject` is guaranteed to resolve
 * and no `@optional()` is required. Combining `@optional()` with a default
 * parameter value hits a limitation of `babel-plugin-transform-typescript-metadata`
 * — parameter properties with default values are silently stripped of their
 * decorators, which breaks Inversify metadata resolution at container bind
 * time.
 */
@injectable()
export class MetricsMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'metrics';

  constructor(
    @multiInject(MetricRecorderToken) private readonly recorders: MetricRecorder[],
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const stream = next(input);
    const collector = ctx.collector;
    const stepName = ctx.step.name;
    const matchingRecorders = this.recorders.filter(
      (recorder) => recorder.observes === 'all' || recorder.observes.stepName === stepName
    );

    if (!collector || matchingRecorders.length === 0) {
      return stream;
    }

    const logger = this.logger;

    return (async function* () {
      let emissionIndex = 0;

      for await (const result of stream) {
        if (result.type === 'continue') {
          for (const recorder of matchingRecorders) {
            try {
              recorder.record(collector, {
                state: result.state,
                meta: result.meta,
                stepName,
                emissionIndex,
              });
            } catch (error) {
              logger.warn({
                message: `[metrics] recorder "${recorder.name}" failed at step "${stepName}": ${
                  error instanceof Error ? error.message : String(error)
                }`,
              });
            }
          }
          emissionIndex += 1;
        }

        yield result;
      }
    })();
  }
}
