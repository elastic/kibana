/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { v4 as uuidV4 } from 'uuid';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import {
  DispatcherPipeline,
  type DispatcherPipelineContract,
  type DispatcherPipelineResult,
} from './execution_pipeline';
import { buildTickSummary, emitTickSummary, startHrtime } from './telemetry';
import type { DispatcherExecutionParams, DispatcherExecutionResult } from './types';

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(
    @inject(DispatcherPipeline) private readonly pipeline: DispatcherPipelineContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async run({
    previousStartedAt = new Date(),
    eventWatermark,
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();
    // Wall-clock `startedAt`/`finishedAt` drive ISO-8601 timestamps; elapsed
    // time is measured with a monotonic clock so tick and per-stage
    // durations share the same resolution and are immune to NTP jumps.
    const startedAtNs = startHrtime();
    const executionUuid = uuidV4();

    let pipelineResult: DispatcherPipelineResult;
    try {
      pipelineResult = await this.pipeline.execute({
        startedAt,
        previousStartedAt,
        eventWatermark,
        executionUuid,
      });
    } catch (err) {
      // The pipeline catches step exceptions internally and converts them
      // into `step_error` halts, so reaching this branch means something
      // below the pipeline (span wrapper, instrumentation, etc.) threw.
      // We still emit a tick summary so the outage is visible in logs,
      // then re-throw so Task Manager records the task as failed.
      const error = err instanceof Error ? err : new Error(String(err));
      emitTickSummary(
        this.logger,
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

    emitTickSummary(this.logger, tick);

    return {
      startedAt,
      tick,
      nextEventWatermark: extractAdvanceableWatermark(pipelineResult),
    };
  }
}

/**
 * The watermark may only advance when the tick fully completed or halted
 * for a controlled, non-error reason. On `step_error` (or any halt that
 * isn't a known clean outcome) we deliberately return `undefined` so
 * `task_runner` preserves the prior watermark and the failed window is
 * re-read on the next tick — that is the invariant that prevents silent
 * data loss.
 */
function extractAdvanceableWatermark(result: DispatcherPipelineResult): string | undefined {
  if (
    !result.completed &&
    result.haltReason !== 'no_episodes' &&
    result.haltReason !== 'no_actions'
  ) {
    return undefined;
  }
  return result.finalState.nextEventWatermark;
}
