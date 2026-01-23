/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { MiddlewareContext, StepMiddleware } from './types';
import type { RuleStepOutput } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

/**
 * Middleware that provides centralized error handling for all steps.
 *
 * This middleware catches errors thrown by steps and logs them with
 * consistent formatting before re-throwing.
 */
@injectable()
export class ErrorHandlingMiddleware implements StepMiddleware {
  public readonly name = 'error_handling';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async execute(
    ctx: MiddlewareContext,
    next: () => Promise<RuleStepOutput>
  ): Promise<RuleStepOutput> {
    try {
      return await next();
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error : new Error(String(error)),
        type: 'StepExecutionError',
        code: ctx.step.name,
      });
      throw error;
    }
  }
}
