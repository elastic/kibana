/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable, multiInject } from 'inversify';
import { type LoggerServiceContract } from '../services/logger_service/logger_service';
import { DispatcherExecutionStepsToken } from './steps/tokens';
import type {
  DispatcherPipelineInput,
  DispatcherPipelineResult,
  DispatcherPipelineState,
  DispatcherStep,
} from './types';
import { withDispatcherSpan } from './with_dispatcher_span';

export type { DispatcherPipelineResult };

export interface DispatcherPipelineContract {
  execute(
    input: DispatcherPipelineInput,
    logger: LoggerServiceContract
  ): Promise<DispatcherPipelineResult>;
}

@injectable()
export class DispatcherPipeline implements DispatcherPipelineContract {
  constructor(
    @multiInject(DispatcherExecutionStepsToken) private readonly steps: DispatcherStep[]
  ) {}

  public async execute(
    input: DispatcherPipelineInput,
    parentLogger: LoggerServiceContract
  ): Promise<DispatcherPipelineResult> {
    let pipelineState: DispatcherPipelineState = { input };

    for (const step of this.steps) {
      const logger = parentLogger.withLabels({ step: step.name });

      if (input.signal.aborted) {
        logger.debug({
          message: `Pipeline aborted before step: ${step.name}`,
        });
        return { completed: false, haltReason: 'aborted', finalState: pipelineState };
      }

      logger.debug({ message: `Executing step: ${step.name}` });

      let output: Awaited<ReturnType<DispatcherStep['execute']>>;
      try {
        output = await withDispatcherSpan(step.name, () => step.execute(pipelineState, logger));
      } catch (err) {
        // If the tick signal fired while the step had an in-flight request (e.g.
        // RequestAbortedError from ES|QL), convert to a clean aborted halt so
        // dispatcher.run() can persist the watermark rather than throwing.
        if (input.signal.aborted) {
          logger.debug({
            message: `step ${step.name} threw while signal was aborted; treating as abort.`,
          });
          return { completed: false, haltReason: 'aborted', finalState: pipelineState };
        }
        throw err;
      }

      if (output.type === 'halt') {
        logger.debug({
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
