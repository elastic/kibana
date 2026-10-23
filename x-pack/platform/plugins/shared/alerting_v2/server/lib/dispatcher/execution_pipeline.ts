/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable, multiInject } from 'inversify';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import { type LoggerServiceContract } from '../services/logger_service/logger_service';
import {
  DispatcherEventPublisher,
  type DispatcherEventPublisherContract,
} from '../events/dispatcher_event_publisher/dispatcher_event_publisher';
import { buildDispatchedWorkflows } from './build_dispatched_workflows';
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
    @multiInject(DispatcherExecutionStepsToken) private readonly steps: DispatcherStep[],
    @inject(DispatcherEventPublisher)
    private readonly eventPublisher: DispatcherEventPublisherContract
  ) {}

  public async execute(
    input: DispatcherPipelineInput,
    parentLogger: LoggerServiceContract
  ): Promise<DispatcherPipelineResult> {
    let pipelineState: DispatcherPipelineState = { input };

    for (const step of this.steps) {
      const logger = parentLogger.withLabels({ step: step.name });

      if (input.signal.aborted) {
        logger.debug({ message: 'Pipeline aborted before step' });
        return { completed: false, haltReason: 'aborted', finalState: pipelineState };
      }

      logger.debug({ message: 'Executing pipeline step' });

      let output: Awaited<ReturnType<DispatcherStep['execute']>>;
      try {
        output = await withDispatcherSpan(step.name, () => step.execute(pipelineState, logger));
      } catch (error) {
        // If the tick signal fired while the step had an in-flight request (e.g.
        // RequestAbortedError from ES|QL), convert to a clean aborted halt so
        // dispatcher.run() can persist the watermark rather than throwing.
        if (input.signal.aborted) {
          logger.debug({ message: 'Step threw while signal was aborted; treating as abort' });
          return { completed: false, haltReason: 'aborted', finalState: pipelineState };
        }

        logger.error({
          error,
          code: ALERTING_LOG_CODES.DISPATCH_STEP_FAILED,
        });
        throw error;
      }

      if (output.type === 'halt') {
        logger.debug({
          message: 'Pipeline halted',
          labels: { resource: output.reason },
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

    this.publishExecutionCompleted(pipelineState, parentLogger);

    return {
      completed: true,
      finalState: pipelineState,
    };
  }

  private publishExecutionCompleted(
    state: DispatcherPipelineState,
    logger: LoggerServiceContract
  ): void {
    try {
      const deliveries = buildDispatchedWorkflows(state);
      if (deliveries.length === 0) {
        return;
      }

      this.eventPublisher.publishExecutionCompleted({ deliveries });
    } catch (error) {
      logger.warn({
        message: 'Failed to publish dispatcher execution completed event',
        error,
        code: ALERTING_LOG_CODES.DISPATCHER_EXECUTION_EVENT_PUBLISH_FAILED,
      });
    }
  }
}
