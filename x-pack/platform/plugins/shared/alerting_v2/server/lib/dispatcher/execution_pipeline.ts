/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import type {
  DispatcherHaltReason,
  DispatcherPipelineInput,
  DispatcherPipelineState,
  DispatcherStep,
} from './types';
import { withDispatcherSpan } from './with_dispatcher_span';

export interface DispatcherPipelineResult {
  readonly completed: boolean;
  readonly haltReason?: DispatcherHaltReason;
  readonly finalState: DispatcherPipelineState;
}

export interface DispatcherPipelineContract {
  execute(input: DispatcherPipelineInput): Promise<DispatcherPipelineResult>;
}

export class DispatcherPipeline implements DispatcherPipelineContract {
  constructor(
    private readonly logger: LoggerServiceContract,
    private readonly steps: DispatcherStep[]
  ) {}

  public async execute(input: DispatcherPipelineInput): Promise<DispatcherPipelineResult> {
    let pipelineState: DispatcherPipelineState = { input };

    for (const step of this.steps) {
      this.logger.debug({ message: `Dispatcher: Executing step: ${step.name}` });

      const output = await withDispatcherSpan(step.name, () => step.execute(pipelineState));

      if (output.type === 'halt') {
        this.logger.debug({
          message: `Dispatcher: Pipeline halted at step: ${step.name}, reason: ${output.reason}`,
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
