/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable, multiInject } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import type {
  DispatcherHaltReason,
  DispatcherPipelineInput,
  DispatcherPipelineState,
  DispatcherStep,
} from './types';
import { DispatcherExecutionStepsToken } from './steps/tokens';
import { withDispatcherSpan } from './with_dispatcher_span';

export interface DispatcherPipelineResult {
  readonly completed: boolean;
  readonly haltReason?: DispatcherHaltReason;
  readonly finalState: DispatcherPipelineState;
}

export interface DispatcherPipelineContract {
  execute(input: DispatcherPipelineInput): Promise<DispatcherPipelineResult>;
}

@injectable()
export class DispatcherPipeline implements DispatcherPipelineContract {
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract,
    @multiInject(DispatcherExecutionStepsToken) private readonly steps: DispatcherStep[]
  ) {
    this.logger = loggerService.forSubsystem('dispatcher');
  }

  public async execute(input: DispatcherPipelineInput): Promise<DispatcherPipelineResult> {
    let pipelineState: DispatcherPipelineState = { input };

    for (const step of this.steps) {
      this.logger.debug({
        message: 'Executing pipeline step',
        labels: { step: step.name },
      });

      try {
        const output = await withDispatcherSpan(step.name, () => step.execute(pipelineState));

        if (output.type === 'halt') {
          this.logger.debug({
            message: 'Pipeline halted',
            labels: { step: step.name, resource: output.reason },
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
      } catch (error) {
        this.logger.error({
          error,
          code: ALERTING_LOG_CODES.DISPATCH_STEP_FAILED,
          labels: { step: step.name },
        });
        throw error;
      }
    }

    return {
      completed: true,
      finalState: pipelineState,
    };
  }
}
