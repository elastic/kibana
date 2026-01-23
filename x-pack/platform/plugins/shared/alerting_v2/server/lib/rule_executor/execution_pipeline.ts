/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionInput, RuleExecutionStep, RulePipelineState, HaltReason } from './types';
import { RuleExecutionStepsToken } from './tokens';
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
    @inject(RuleExecutionStepsToken) private readonly steps: RuleExecutionStep[]
  ) {}

  public async execute(input: RuleExecutionInput): Promise<PipelineResult> {
    let pipelineState: RulePipelineState = { input };

    for (const step of this.steps) {
      this.logger.debug({ message: `Executing step: ${step.name}` });

      let output;
      try {
        output = await step.execute(pipelineState);
      } catch (error) {
        this.logger.error({ error, type: `StepExecutionError:${step.name}` });
        throw error;
      }

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
}
