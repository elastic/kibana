/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type {
  RuleExecutionInput,
  RuleExecutionStep,
  RulePipelineState,
  RuleStepOutput,
  HaltReason,
} from './types';
import { RuleExecutionMiddlewaresToken, RuleExecutionStepsToken } from './tokens';
import { type RuleExecutionMiddleware, type RuleExecutionMiddlewareContext } from './middleware';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';

export interface RuleExecutionPipelineResult {
  readonly completed: boolean;
  readonly haltReason?: HaltReason;
  readonly finalState: RulePipelineState;
}

export interface RuleExecutionPipelineContract {
  execute(input: RuleExecutionInput): Promise<RuleExecutionPipelineResult>;
}

@injectable()
export class RuleExecutionPipeline implements RuleExecutionPipelineContract {
  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(RuleExecutionStepsToken) private readonly steps: RuleExecutionStep[],
    @inject(RuleExecutionMiddlewaresToken) private readonly middlewares: RuleExecutionMiddleware[]
  ) {}

  public async execute(input: RuleExecutionInput): Promise<RuleExecutionPipelineResult> {
    let pipelineState: RulePipelineState = { input };

    for (const step of this.steps) {
      this.logger.debug({ message: `RuleExecutor: Executing step: ${step.name}` });

      const context: RuleExecutionMiddlewareContext = { step, state: pipelineState };
      const output = await this.runMiddlewareChain(context);

      if (output.type === 'halt') {
        this.logger.debug({
          message: `RuleExecutor: Pipeline halted at step: ${step.name}, reason: ${output.reason}`,
        });

        return {
          completed: false,
          haltReason: output.reason,
          finalState: pipelineState,
        };
      }

      if (output.data) {
        pipelineState = { ...pipelineState, ...output.data };
      }
    }

    return {
      completed: true,
      finalState: pipelineState,
    };
  }

  /**
   * Builds and executes the middleware chain for a step.
   *
   * Middleware are executed in order (first middleware is outermost).
   * Each middleware wraps the next, with the innermost being the step itself.
   */
  private runMiddlewareChain(context: RuleExecutionMiddlewareContext): Promise<RuleStepOutput> {
    const { step, state } = context;

    // Build chain from right to left: last middleware wraps step.execute()
    const chain = this.middlewares.reduceRight(
      (next, middleware) => () => middleware.execute(context, next),
      () => step.execute(state)
    );

    return chain();
  }
}
