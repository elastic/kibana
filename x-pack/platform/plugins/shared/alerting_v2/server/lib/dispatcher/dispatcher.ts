/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { LogMeta } from '@kbn/logging';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import {
  DispatcherPipeline,
  type DispatcherPipelineContract,
  type DispatcherPipelineResult,
} from './execution_pipeline';
import type {
  DispatcherExecutionParams,
  DispatcherExecutionResult,
  DispatcherTickSummary,
} from './types';

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

/**
 * Structured log meta shape for a single dispatcher tick. Lives under the
 * `kibana.alerting_v2.dispatcher.tick` namespace so consumers (ES|QL, Logs
 * app) can target a stable, unambiguous key without colliding with ECS.
 */
export interface DispatcherTickLogMeta extends LogMeta {
  kibana: {
    alerting_v2: {
      dispatcher: {
        tick: DispatcherTickSummary;
      };
    };
  };
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(
    @inject(DispatcherPipeline) private readonly pipeline: DispatcherPipelineContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async run({
    previousStartedAt = new Date(),
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();
    // `startedAt`/`finishedAt` are wall-clock `Date` values used to emit
    // ISO-8601 timestamps. Elapsed time is measured with
    // `process.hrtime.bigint()` so that tick and per-stage durations are
    // on the same monotonic clock — avoids NTP jumps and matches the
    // resolution contract of `DispatcherStageTiming.duration_ms`.
    const startedAtNs = process.hrtime.bigint();

    let pipelineResult: DispatcherPipelineResult;
    try {
      pipelineResult = await this.pipeline.execute({ startedAt, previousStartedAt });
    } catch (err) {
      // The pipeline catches step exceptions internally and converts them
      // into `step_error` halts, so reaching this branch means something
      // below the pipeline (span wrapper, instrumentation, etc.) threw.
      // We still emit a tick summary so the outage is visible in logs,
      // then re-throw so Task Manager records the task as failed.
      const error = err instanceof Error ? err : new Error(String(err));
      this.emitTickSummary(
        buildTickSummary({
          startedAt,
          startedAtNs,
          previousStartedAt,
          completed: false,
          haltReason: 'step_error',
          stages: [],
        })
      );
      this.logger.error({ error, type: 'dispatcher:pipeline' });
      throw error;
    }

    const tick = buildTickSummary({
      startedAt,
      startedAtNs,
      previousStartedAt,
      completed: pipelineResult.completed,
      haltReason: pipelineResult.haltReason ?? null,
      stages: pipelineResult.stageTimings,
    });

    this.emitTickSummary(tick);

    return { startedAt, tick };
  }

  private emitTickSummary(tick: DispatcherTickSummary): void {
    this.logger.info<DispatcherTickLogMeta>({
      message: 'dispatcher tick complete',
      meta: {
        kibana: {
          alerting_v2: {
            dispatcher: { tick },
          },
        },
      },
    });
  }
}

function buildTickSummary({
  startedAt,
  startedAtNs,
  previousStartedAt,
  completed,
  haltReason,
  stages,
}: {
  startedAt: Date;
  startedAtNs: bigint;
  previousStartedAt: Date;
  completed: boolean;
  haltReason: DispatcherTickSummary['halt_reason'];
  stages: DispatcherTickSummary['stages'];
}): DispatcherTickSummary {
  const finishedAt = new Date();
  const durationMs = Number(process.hrtime.bigint() - startedAtNs) / 1_000_000;
  return {
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: Math.round(durationMs * 1000) / 1000,
    previous_started_at: previousStartedAt.toISOString(),
    completed,
    halt_reason: haltReason,
    stages,
  };
}
