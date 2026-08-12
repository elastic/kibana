/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { inject, injectable } from 'inversify';
import { v4 as uuidV4 } from 'uuid';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import type { DispatcherExecutionParams, DispatcherExecutionResult } from './types';
import {
  OVERLAP_WINDOW_MINUTES,
  MAX_WINDOW_MINUTES,
  SETTLE_BUFFER_SECONDS,
  TICK_DEADLINE_MS,
} from './constants';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { computeNextWatermark } from './watermark';

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
    eventWatermark,
    signal = new AbortController().signal,
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();

    if (!eventWatermark) {
      this.logger.warn({
        code: ALERTING_LOG_CODES.DISPATCHER_COLD_START,
        message: () =>
          `Dispatcher: no persisted watermark; starting from ${OVERLAP_WINDOW_MINUTES}m ago. ` +
          `Rule events older than that will not be dispatched.`,
      });
    }

    const resolvedWatermark =
      eventWatermark ?? moment(startedAt).subtract(OVERLAP_WINDOW_MINUTES, 'minutes').toDate();

    const windowStart = moment(resolvedWatermark)
      .subtract(OVERLAP_WINDOW_MINUTES, 'minutes')
      .toDate();
    const maxEnd = moment(windowStart).add(MAX_WINDOW_MINUTES, 'minutes').toDate();
    const settled = moment(startedAt).subtract(SETTLE_BUFFER_SECONDS, 'seconds').toDate();
    const windowEnd = maxEnd < settled ? maxEnd : settled;

    if (windowEnd <= windowStart) {
      // Degenerate: watermark is ahead of now − settle (e.g. right after cold start with a fast
      // clock). Skip the scan and hold the watermark to avoid a regress.
      this.logger.debug({
        message: () =>
          `Dispatcher: windowEnd (${windowEnd.toISOString()}) ≤ windowStart ` +
          `(${windowStart.toISOString()}); skipping scan.`,
      });
      return {
        startedAt,
        nextWatermark: resolvedWatermark,
        pipelineResult: {
          completed: true,
          finalState: {
            input: {
              startedAt,
              eventWatermark: resolvedWatermark,
              windowStart,
              windowEnd,
              executionUuid: uuidV4(),
              signal,
            },
          },
        },
      };
    }

    const executionUuid = uuidV4();

    // Combine the TM-provided signal with a self-imposed deadline so the
    // pipeline always stops well before TM marks the task expired. Past
    // `isExpired`, the returned state is discarded — the watermark would freeze.
    // Uses explicit AbortController + setTimeout rather than AbortSignal.timeout /
    // AbortSignal.any because those static methods are absent in the jsdom test env.
    const deadlineController = new AbortController();
    const deadlineTimer = setTimeout(() => deadlineController.abort(), TICK_DEADLINE_MS);

    const tickController = new AbortController();
    const abortTick = () => tickController.abort();
    if (signal.aborted) {
      abortTick();
    } else {
      signal.addEventListener('abort', abortTick, { once: true });
      deadlineController.signal.addEventListener('abort', abortTick, { once: true });
    }

    let pipelineResult;
    try {
      const input = {
        startedAt,
        eventWatermark: resolvedWatermark,
        windowStart,
        windowEnd,
        executionUuid,
        signal: tickController.signal,
      };
      pipelineResult = await this.pipeline.execute(input);

      if (pipelineResult.haltReason === 'aborted') {
        if (deadlineController.signal.aborted) {
          this.logger.warn({
            code: ALERTING_LOG_CODES.DISPATCHER_TICK_DEADLINE_EXCEEDED,
            message: () =>
              `Dispatcher: tick deadline (${TICK_DEADLINE_MS}ms) exceeded; pipeline stopped early. ` +
              `Watermark is safe.`,
          });
        } else {
          this.logger.debug({
            message: () => `Dispatcher: pipeline aborted by Task Manager signal.`,
          });
        }
      }

      return {
        startedAt,
        nextWatermark: computeNextWatermark({ input, result: pipelineResult }),
        pipelineResult,
      };
    } finally {
      clearTimeout(deadlineTimer);
      signal.removeEventListener('abort', abortTick);
      deadlineController.signal.removeEventListener('abort', abortTick);
    }
  }
}
