/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
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
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { ALERT_EVENTS_DATA_STREAM, AlertEvent } from '../../resources/datastreams/alert_events';
import { buildExecutionUuid } from './build_alert_events';

/**
 * Raw input from the task runner.
 * The pipeline creates the ExecutionContext from the signal.
 */
export interface RuleExecutionPipelineInput {
  readonly ruleId: string;
  readonly spaceId: string;
  readonly scheduledAt: string;
  readonly executionUuid: string;
  readonly abortSignal: AbortSignal;
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
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @multiInject(RuleExecutionStepsToken) private readonly steps: RuleExecutionStep[],
    @multiInject(RuleExecutionMiddlewaresToken)
    private readonly middlewares: RuleExecutionMiddleware[],
    @inject(MetricCollectorFactoryToken)
    private readonly metricCollectorFactory: MetricCollectorFactoryContract,
    @inject(RuleExecutorEventPublisher)
    private readonly eventPublisher: RuleExecutorEventPublisherContract,
    @inject(StorageServiceInternalToken)
    private readonly storageService: StorageServiceContract
  ) { }

  public async execute(rawInput: RuleExecutionPipelineInput): Promise<RuleExecutionPipelineResult> {
    const executionContext = createExecutionContext(rawInput.abortSignal);
    const collector = this.metricCollectorFactory.create({ executionId: rawInput.executionUuid });

    const input: RuleExecutionInput = {
      ruleId: rawInput.ruleId,
      spaceId: rawInput.spaceId,
      scheduledAt: rawInput.scheduledAt,
      executionContext,
    };

    let pipelineState: RulePipelineState = { input };

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
          this.logger.debug({
            message: `RuleExecutor: Pipeline halted at step: ${result.reason}`,
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

      // Written strictly after every per-batch StoreAlertEventsStep write has
      // completed, so the marker is the last document of this execution. A
      // monotonic auto-refresh therefore guarantees: marker visible =>
      // every event of this execution visible. The dispatcher gates on this so
      // it never acts on a partially-written execution (rna-program#437).
      // Must match the uuid the alert-event builder stamps on `execution.uuid`
      // (deterministic from ruleId/spaceId/scheduledAt), NOT the Task Manager
      // run uuid in `rawInput.executionUuid` — otherwise the dispatcher's gate
      // groups the marker and the events under different uuids and never
      // correlates them.
      await writeExecutionEndMarkerDoc({
        params: {
          execution: {
            uuid: buildExecutionUuid({
              ruleId: rawInput.ruleId,
              spaceId: rawInput.spaceId,
              scheduledTimestamp: rawInput.scheduledAt,
            }),
          },
          timestamp: new Date().toISOString(),
          rule: { id: rawInput.ruleId },
          spaceId: rawInput.spaceId,
        },
        deps: { storageService: this.storageService },
      });

      this.publishExecutionSucceeded(rawInput, collector, pipelineState, snapshot);
      return {
        completed: true,
        finalState: pipelineState,
        metrics: snapshot,
      };
    } catch (error) {
      this.publishExecutionFailed(rawInput, error);
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
    const { rule } = finalState;

    if (!rule) {
      this.logger.warn({
        message: `[rule_executor] Skipping rule.execution.succeeded for rule "${rawInput.ruleId}": no rule in final state.`,
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
      this.logger.warn({
        message: `[rule_executor] Failed to publish rule.execution.succeeded event: ${error instanceof Error ? error.message : String(error)
          }`,
      });
    }
  }

  private publishExecutionFailed(rawInput: RuleExecutionPipelineInput, error: unknown): void {
    try {
      this.eventPublisher.publishExecutionFailed({
        rule: { id: rawInput.ruleId, spaceId: rawInput.spaceId },
        error: error instanceof Error ? error.message : String(error),
      });
    } catch (publishError) {
      this.logger.warn({
        message: `[rule_executor] Failed to publish rule.execution.failed event: ${publishError instanceof Error ? publishError.message : String(publishError)
          }`,
      });
    }
  }
}

/**
 * Writes a single execution-end marker document to `.rule-events`.
 *
 * Called once, after the pipeline stream has drained, so it is the last write
 * of the execution. Combined with Elasticsearch's monotonic refresh, this lets
 * the dispatcher treat "marker visible" as "all events of this execution
 * visible" and avoid acting on a partially-written execution (rna-program#437).
 *
 * Uses the default `refresh: false`; the guarantee comes from write ordering,
 * not a synchronous refresh (which was intentionally removed in #274008).
 */
const writeExecutionEndMarkerDoc = async ({
  params,
  deps,
}: {
  params: {
    execution: { uuid: string };
    timestamp: string;
    rule: { id: string };
    spaceId: string;
  };
  deps: {
    storageService: StorageServiceContract;
  };
}): Promise<void> => {

  const doc: Partial<AlertEvent> = {
    '@timestamp': params.timestamp,
    type: 'execution_end_marker',
    execution: { uuid: params.execution.uuid },
    rule: { id: params.rule.id, version: 1 },
    space_id: params.spaceId,
  };

  await deps.storageService.bulkIndexDocs({
    index: ALERT_EVENTS_DATA_STREAM,
    docs: [
      doc,
    ],
  });
};