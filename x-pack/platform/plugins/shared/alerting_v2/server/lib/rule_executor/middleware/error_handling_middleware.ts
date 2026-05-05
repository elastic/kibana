/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionMiddlewareContext, RuleExecutionMiddleware } from './types';
import type { PipelineStateStream } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { identifyErrorWithStepName } from '../step_error';

/**
 * Middleware that provides centralized error handling for all steps.
 *
 * Catches errors thrown by steps, logs them with consistent formatting,
 * identifies them with the failing step name (so the task runner can map
 * the failure to a `kibana.alerting_v2.rule_executor` reason in the execute
 * summary), and re-throws.
 */
@injectable()
export class ErrorHandlingMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'error_handling';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const stream = next(input);
    const self = this;

    return (async function* () {
      try {
        for await (const result of stream) {
          yield result;
        }
      } catch (error) {
        self.logger.error({
          error,
          type: 'StepExecutionError',
          code: ctx.step.name,
        });

        throw identifyErrorWithStepName(error, ctx.step.name);
      }
    })();
  }
}
