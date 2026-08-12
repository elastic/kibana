/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { v4 as uuidV4 } from 'uuid';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import type { DispatcherExecutionParams, DispatcherExecutionResult } from './types';
import { toAction } from './steps/store_actions_step';
import {
  OVERLAP_WINDOW_MINUTES,
  MAX_WINDOW_MINUTES,
  SETTLE_BUFFER_SECONDS,
  TICK_DEADLINE_MS,
  STUCK_TICK_LIMIT,
} from './constants';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import { computeNextWatermark } from './watermark';

const NEVER_ABORTED = new AbortController().signal;

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(
    @inject(DispatcherPipeline) private readonly pipeline: DispatcherPipelineContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async run({
    eventWatermark,
    stuckTicks = 0,
    signal = NEVER_ABORTED,
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
      eventWatermark ?? new Date(startedAt.getTime() - OVERLAP_WINDOW_MINUTES * 60_000);

    const windowStart = new Date(resolvedWatermark.getTime() - OVERLAP_WINDOW_MINUTES * 60_000);
    const maxEnd = new Date(windowStart.getTime() + MAX_WINDOW_MINUTES * 60_000);
    const settled = new Date(startedAt.getTime() - SETTLE_BUFFER_SECONDS * 1_000);
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
        nextStuckTicks: 0,
        pipelineResult: {
          completed: true,
          finalState: {
            input: {
              startedAt,
              eventWatermark: resolvedWatermark,
              windowStart,
              windowEnd,
              executionUuid: '',
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

    try {
      const input = {
        startedAt,
        eventWatermark: resolvedWatermark,
        windowStart,
        windowEnd,
        executionUuid,
        signal: tickController.signal,
      };
      const pipelineResult = await this.pipeline.execute(input);

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

      const nextWatermark = computeNextWatermark({ input, result: pipelineResult });
      const isStuck = nextWatermark.getTime() === resolvedWatermark.getTime();
      const nextStuckTicks = isStuck ? stuckTicks + 1 : 0;

      // Per-tick observability. All fields are lazy so the string is never built
      // at production log levels where debug is off.
      this.logger.debug({
        message: () => {
          const watermarkLagMs = startedAt.getTime() - nextWatermark.getTime();
          const windowSpanMs = windowEnd.getTime() - windowStart.getTime();
          return [
            'Dispatcher tick:',
            `halt_reason=${pipelineResult.haltReason ?? 'completed'}`,
            `watermark_lag_ms=${watermarkLagMs}`,
            `window_span_ms=${windowSpanMs}`,
            `truncated=${pipelineResult.finalState.truncated ?? false}`,
            `episode_count=${pipelineResult.finalState.episodes?.length ?? 0}`,
            `stuck_ticks=${nextStuckTicks}`,
          ].join(' ');
        },
      });

      if (nextStuckTicks >= STUCK_TICK_LIMIT) {
        // The watermark has not advanced for STUCK_TICK_LIMIT consecutive ticks.
        // A permanent stall is worse than silent loss: force-record the blocking
        // episodes as `unmatched` so the `.alert-actions` dedup mark moves past
        // them, then advance the watermark to windowEnd.
        const blockingEpisodes = pipelineResult.finalState.episodes ?? [];
        const lagMs = startedAt.getTime() - resolvedWatermark.getTime();

        this.logger.error({
          code: ALERTING_LOG_CODES.DISPATCHER_WATERMARK_STUCK,
          message: () =>
            `Dispatcher: watermark stuck for ${STUCK_TICK_LIMIT} consecutive ticks ` +
            `(lag: ${lagMs}ms, blocking episodes: ${blockingEpisodes.length}). ` +
            `Force-recording as unmatched and advancing to ${input.windowEnd.toISOString()}.`,
          error: new Error(`Watermark stuck at ${resolvedWatermark.toISOString()}`),
        });

        if (blockingEpisodes.length > 0) {
          const escapeNow = new Date();
          await this.storageService.bulkIndexDocs({
            index: ALERT_ACTIONS_DATA_STREAM,
            docs: blockingEpisodes.map((episode) =>
              toAction({
                episode,
                actionType: 'unmatched',
                now: escapeNow,
                reason: 'watermark-stuck escape hatch; episode force-recorded as unmatched',
                spaceId: episode.space_id,
              })
            ),
          });
        }

        return {
          startedAt,
          nextWatermark: input.windowEnd,
          nextStuckTicks: 0,
          pipelineResult,
        };
      }

      return {
        startedAt,
        nextWatermark,
        nextStuckTicks,
        pipelineResult,
      };
    } finally {
      clearTimeout(deadlineTimer);
      signal.removeEventListener('abort', abortTick);
      deadlineController.signal.removeEventListener('abort', abortTick);
    }
  }
}
