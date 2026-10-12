/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionMiddlewareContext, RuleExecutionMiddleware } from './types';
import type { PipelineStateStream, RulePipelineState } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { isRuleExecutionCancellationError } from '../../execution_context';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { isEsqlUserError } from '../../errors/esql_user_error';

/**
 * Tracks errors already logged by an {@link ErrorHandlingMiddleware} layer.
 *
 * There is one middleware layer per step, nested so a failure unwinds through
 * every downstream layer. Without this, each layer would log the same error,
 * mislabelled with its own (downstream) step. The origin step's layer catches
 * the error first and records it here; downstream layers skip logging.
 */
const loggedErrors = new WeakSet<object>();

/**
 * Middleware that provides centralized error handling for all steps.
 *
 * This middleware catches errors thrown by steps and logs them with
 * consistent formatting before re-throwing.
 */
@injectable()
export class ErrorHandlingMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'error_handling';

  private readonly logger: LoggerServiceContract;

  constructor(@inject(LoggerServiceToken) loggerService: LoggerServiceContract) {
    this.logger = loggerService.forSubsystem('ruleExecutor');
  }

  private isErrorObject(value: unknown): value is object {
    return value !== null && typeof value === 'object';
  }

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const stream = next(input);
    const fallbackLogger = this.logger;

    const { isErrorObject } = this;

    return (async function* () {
      let latestState: RulePipelineState | undefined;

      try {
        for await (const result of stream) {
          latestState = result.state;
          yield result;
        }
      } catch (error) {
        const alreadyLogged = isErrorObject(error) && loggedErrors.has(error);

        if (!isRuleExecutionCancellationError(error) && !alreadyLogged) {
          (latestState?.logger ?? fallbackLogger).withLabels({ step: ctx.step.name }).error({
            message: isEsqlUserError(error) ? 'Rule query failed to parse or verify' : undefined,
            error,
            code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
          });

          if (isErrorObject(error)) {
            loggedErrors.add(error);
          }
        }

        throw error;
      }
    })();
  }
}
