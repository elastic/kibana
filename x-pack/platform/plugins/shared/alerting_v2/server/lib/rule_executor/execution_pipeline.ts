/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpaceId } from '@kbn/core-spaces-common';
import { inject, injectable, multiInject } from 'inversify';
import type {
  RuleExecutionInput,
  RuleExecutionStep,
  RulePipelineState,
  HaltReason,
  PipelineStateStream,
} from './types';
import { RuleExecutionMiddlewaresToken, RuleExecutionStepsToken } from './tokens';
import { type RuleExecutionMiddleware, type RuleExecutionMiddlewareContext } from './middleware';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import { createExecutionContext } from '../execution_context';
import type {
  MetricCollector,
  MetricCollectorFactoryContract,
  RuleExecutionMetricsSnapshot,
} from './metrics/types';
import { MetricCollectorFactoryToken } from './metrics/tokens';
import { RULE_EXECUTION_COUNTERS } from './metrics/counters';
import {
  RuleExecutorEventPublisher,
  type RuleExecutorEventPublisherContract,
} from '../events/rule_executor_event_publisher/rule_executor_event_publisher';

/**
 * Raw input from the task runner.
 * The pipeline creates the ExecutionContext from the signal.
 */
export interface RuleExecutionPipelineInput {
  readonly ruleId: string;
  readonly spaceId: SpaceId;
  readonly scheduledAt: string;
  readonly executionUuid: string;
  readonly abortSignal: AbortSignal;
  /** Bound per-execution logger from the task runner. */
  readonly logger: LoggerServiceContract;
}

export interface RuleExecutionPipelineResult {
  readonly completed: boolean;
  readonly haltReason?: HaltReason;
  readonly finalState: RulePipelineState;
  readonly metrics: RuleExecutionMetricsSnapshot;
}

export interface RuleExecutionPipelineContract {
  execute(input: RuleExecutionPipelineInput): Promise<RuleExecutionPipelineResult>;
}

@injectable()
export class RuleExecutionPipeline implements RuleExecutionPipelineContract {
  constructor(
    @multiInject(RuleExecutionStepsToken) private readonly steps: RuleExecutionStep[],
    @multiInject(RuleExecutionMiddlewaresToken)
    private readonly middlewares: RuleExecutionMiddleware[],
    @inject(MetricCollectorFactoryToken)
    private readonly metricCollectorFactory: MetricCollectorFactoryContract,
    @inject(RuleExecutorEventPublisher)
    private readonly eventPublisher: RuleExecutorEventPublisherContract
  ) {}

  public async execute(rawInput: RuleExecutionPipelineInput): Promise<RuleExecutionPipelineResult> {
    const executionContext = createExecutionContext(rawInput.abortSignal);
    const collector = this.metricCollectorFactory.create({ executionId: rawInput.executionUuid });
    const logger = rawInput.logger;

    const input: RuleExecutionInput = {
      ruleId: rawInput.ruleId,
      spaceId: rawInput.spaceId,
      scheduledAt: rawInput.scheduledAt,
      executionContext,
    };

    let pipelineState: RulePipelineState = { input, logger };

    let stream: PipelineStateStream = (async function* () {
      yield { type: 'continue', state: pipelineState };
    })();

    for (const step of this.steps) {
      stream = this.runMiddlewareChain({ step, collector }, stream);
    }

    try {
      for await (const result of stream) {
        pipelineState = result.state;

        if (result.type === 'halt') {
          pipelineState.logger.debug({
            message: 'Pipeline halted',
            labels: { resource: result.reason },
          });

          return {
            completed: false,
            haltReason: result.reason,
            finalState: pipelineState,
            metrics: collector.finalize(),
          };
        }
      }

      const snapshot = collector.finalize();
      this.publishExecutionSucceeded(rawInput, collector, pipelineState, snapshot);
      return {
        completed: true,
        finalState: pipelineState,
        metrics: snapshot,
      };
    } catch (error) {
      this.publishExecutionFailed(rawInput, pipelineState.logger, error);
      throw error;
    } finally {
      collector.finalize();
    }
  }

  /**
   * Builds and executes the middleware chain for a step.
   *
   * Middleware are executed in order (first middleware is outermost).
   * Each middleware wraps the next, with the innermost being the step itself.
   */
  private runMiddlewareChain(
    context: RuleExecutionMiddlewareContext,
    input: PipelineStateStream
  ): PipelineStateStream {
    const { step } = context;

    // Build chain from right to left: last middleware wraps step.executeStream()
    const chain = this.middlewares.reduceRight(
      (next, middleware) => (stream: PipelineStateStream) =>
        middleware.execute(context, next, stream),
      (stream: PipelineStateStream) => step.executeStream(stream)
    );

    return chain(input);
  }

  private publishExecutionSucceeded(
    rawInput: RuleExecutionPipelineInput,
    collector: MetricCollector,
    finalState: RulePipelineState,
    snapshot: RuleExecutionMetricsSnapshot
  ): void {
    const { rule, logger } = finalState;

    if (!rule) {
      logger.warn({
        message: 'Skipping rule execution succeeded event publish',
        code: ALERTING_LOG_CODES.RULE_EXECUTION_EVENT_PUBLISH_SKIPPED,
      });
      return;
    }

    try {
      this.eventPublisher.publishExecutionSucceeded({
        executionId: collector.executionId,
        scheduledAt: rawInput.scheduledAt,
        ruleEventsGenerated: snapshot.counters[RULE_EXECUTION_COUNTERS.ruleEventsGenerated] ?? 0,
        rule: {
          ruleId: rawInput.ruleId,
          spaceId: rawInput.spaceId,
          kind: rule.kind,
          tags: rule.metadata.tags ?? [],
        },
      });
    } catch (error) {
      logger.warn({
        message: 'Failed to publish rule execution succeeded event',
        error,
        code: ALERTING_LOG_CODES.RULE_EXECUTION_EVENT_PUBLISH_FAILED,
      });
    }
  }

  private publishExecutionFailed(
    rawInput: RuleExecutionPipelineInput,
    logger: LoggerServiceContract,
    error: unknown
  ): void {
    try {
      this.eventPublisher.publishExecutionFailed({
        rule: { id: rawInput.ruleId, spaceId: rawInput.spaceId },
        error: error instanceof Error ? error.message : String(error),
      });
    } catch (publishError) {
      logger.warn({
        message: 'Failed to publish rule execution failed event',
        error: publishError,
        code: ALERTING_LOG_CODES.RULE_EXECUTION_EVENT_PUBLISH_FAILED,
      });
    }
  }
}
