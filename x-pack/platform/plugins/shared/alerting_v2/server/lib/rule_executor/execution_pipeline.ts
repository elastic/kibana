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
import { RuleExecutionStepsToken } from './tokens';
import { StepMiddlewareToken, type StepMiddleware, type MiddlewareContext } from './middleware';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';

/**
 * Pipeline result - pure domain, NO task manager types.
 * TaskRunner interprets this to build RunResult.
 */
export interface PipelineResult {
  readonly completed: boolean;
  readonly haltReason?: HaltReason;
  readonly finalState: RulePipelineState;
}

export interface ExecutionPipelineContract {
  execute(input: RuleExecutionInput): Promise<PipelineResult>;
}

@injectable()
export class RuleExecutionPipeline implements ExecutionPipelineContract {
  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(RuleExecutionStepsToken) private readonly steps: RuleExecutionStep[],
    @inject(StepMiddlewareToken) private readonly middlewares: StepMiddleware[]
  ) {}

  public async execute(input: RuleExecutionInput): Promise<PipelineResult> {
    let pipelineState: RulePipelineState = { input };

    for (const step of this.steps) {
      this.logger.debug({ message: `Executing step: ${step.name}` });

      const context: MiddlewareContext = { step, state: pipelineState };
      const output = await this.runMiddlewareChain(context);

      if (output.type === 'halt') {
        this.logger.debug({
          message: `Pipeline halted at step: ${step.name}, reason: ${output.reason}`,
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
  private runMiddlewareChain(context: MiddlewareContext): Promise<RuleStepOutput> {
    const { step, state } = context;

    // Build chain from right to left: last middleware wraps step.execute()
    const chain = this.middlewares.reduceRight(
      (next, middleware) => () => middleware.execute(context, next),
      () => step.execute(state)
    );

    return chain();
  }
}
