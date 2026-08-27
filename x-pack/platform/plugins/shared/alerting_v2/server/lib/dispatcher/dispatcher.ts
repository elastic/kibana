/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { inject, injectable } from 'inversify';
import { isError } from 'lodash';
import { v4 as uuidV4 } from 'uuid';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import {
  MAX_WINDOW_MINUTES,
  OVERLAP_WINDOW_MINUTES,
  PRE_FETCH_STUCK_ADVANCE_LAG_MS,
  SETTLE_BUFFER_SECONDS,
  STUCK_TICK_LIMIT,
  TICK_DEADLINE_MS,
} from './constants';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import { toAction } from './steps/store_actions_step';
import type {
  DispatcherExecutionParams,
  DispatcherExecutionResult,
  DispatcherPipelineInput,
} from './types';
import { computeNextWatermark } from './watermark';

const NEVER_ABORTED = new AbortController().signal;

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  private readonly parentLogger: LoggerServiceContract;

  constructor(
    @inject(DispatcherPipeline) private readonly pipeline: DispatcherPipelineContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract,
    @inject(LoggerServiceToken) logger: LoggerServiceContract
  ) {
    this.parentLogger = logger.forSubsystem('dispatcher');
  }

  public async run({
    eventWatermark,
    stuckTicks = 0,
    signal = NEVER_ABORTED,
    taskId,
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();
    const logger = this.parentLogger.withLabels({ task_id: taskId });

    const isValidDate = (d: Date | undefined): d is Date =>
      d instanceof Date && !Number.isNaN(d.getTime());

    if (!isValidDate(eventWatermark)) {
      const code = eventWatermark
        ? ALERTING_LOG_CODES.DISPATCHER_INVALID_WATERMARK
        : ALERTING_LOG_CODES.DISPATCHER_COLD_START;
      logger.warn({
        code,
        message: () =>
          eventWatermark
            ? `eventWatermark is Invalid Date; falling back to cold start ` +
              `(${OVERLAP_WINDOW_MINUTES}m ago). Rule events older than that will not be dispatched.`
            : `no persisted watermark; starting from ${OVERLAP_WINDOW_MINUTES}m ago. ` +
              `Rule events older than that will not be dispatched.`,
      });
    }

    const resolvedWatermark = isValidDate(eventWatermark)
      ? eventWatermark
      : new Date(startedAt.getTime() - OVERLAP_WINDOW_MINUTES * 60_000);

    const windowStart = new Date(resolvedWatermark.getTime() - OVERLAP_WINDOW_MINUTES * 60_000);
    const maxEnd = new Date(windowStart.getTime() + MAX_WINDOW_MINUTES * 60_000);
    const settled = new Date(startedAt.getTime() - SETTLE_BUFFER_SECONDS * 1_000);
    const windowEnd = maxEnd < settled ? maxEnd : settled;

    if (windowEnd <= windowStart) {
      // Degenerate: watermark is future-dated relative to now − settle. Only reachable via a
      // persisted watermark that is ahead of the current clock — clock skew between Kibana nodes
      // or corrupt task state. Skip the scan and hold the watermark to avoid a regress.
      logger.debug({
        message: () =>
          `windowEnd (${windowEnd.toISOString()}) ≤ windowStart ` +
          `(${windowStart.toISOString()}); skipping scan.`,
      });
      return {
        startedAt,
        nextWatermark: resolvedWatermark,
        // Preserve stuckTicks so the escape hatch can eventually fire if the
        // watermark is permanently future-dated (e.g. corrupt task state).
        nextStuckTicks: stuckTicks + 1,
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
      const input: DispatcherPipelineInput = {
        startedAt,
        eventWatermark: resolvedWatermark,
        windowStart,
        windowEnd,
        executionUuid,
        signal: tickController.signal,
      };
      const pipelineResult = await this.pipeline.execute(input, logger);

      if (pipelineResult.haltReason === 'aborted') {
        if (deadlineController.signal.aborted) {
          logger.warn({
            code: ALERTING_LOG_CODES.DISPATCHER_TICK_DEADLINE_EXCEEDED,
            message: () =>
              `tick deadline (${TICK_DEADLINE_MS}ms) exceeded; pipeline stopped early. ` +
              `Watermark is safe.`,
          });
        } else {
          logger.debug({
            message: 'pipeline aborted by Task Manager signal.',
          });
        }
      }

      const nextWatermark = computeNextWatermark({ input, result: pipelineResult });
      const isStuck = nextWatermark.getTime() === resolvedWatermark.getTime();
      const nextStuckTicks = isStuck ? stuckTicks + 1 : 0;

      // Per-tick observability. All fields are lazy so the string is never built
      // at production log levels where debug is off.
      logger.debug({
        message: () => {
          const watermarkLagMs = startedAt.getTime() - nextWatermark.getTime();
          const windowSpanMs = windowEnd.getTime() - windowStart.getTime();
          return [
            'tick:',
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
        const blockingEpisodes = pipelineResult.finalState.episodes ?? [];
        const lagMs = startedAt.getTime() - resolvedWatermark.getTime();

        if (blockingEpisodes.length === 0) {
          // Pipeline stuck before FetchEpisodesStep (e.g. WaitForResources timeout or
          // ES overload aborting before any episodes are fetched). Advancing would
          // silently drop whatever is in the window. Hold and reset while lag is
          // still within one max scan window so transient infra pressure can recover.
          // Once lag exceeds that, skip the unread window rather than stall forever.
          if (lagMs > PRE_FETCH_STUCK_ADVANCE_LAG_MS) {
            const clampedEscapeTarget = new Date(
              Math.max(input.windowEnd.getTime(), resolvedWatermark.getTime())
            );
            logger.error({
              code: ALERTING_LOG_CODES.DISPATCHER_ESCAPE_HATCH_PRE_FETCH_FORCED_ADVANCE,
              message: () =>
                `escape hatch triggered but pipeline stopped before FetchEpisodesStep ` +
                `(lag: ${lagMs}ms > ${MAX_WINDOW_MINUTES}m). Force-advancing to ` +
                `${clampedEscapeTarget.toISOString()}; unread episodes in this window are skipped.`,
              error: new Error(`Pre-fetch watermark stuck at ${resolvedWatermark.toISOString()}`),
            });
            return {
              startedAt,
              nextWatermark: clampedEscapeTarget,
              nextStuckTicks: 0,
              pipelineResult,
            };
          }

          logger.warn({
            code: ALERTING_LOG_CODES.DISPATCHER_ESCAPE_HATCH_PRE_FETCH_STUCK,
            message: () =>
              `escape hatch triggered but pipeline stopped before FetchEpisodesStep ` +
              `(lag: ${lagMs}ms). Holding watermark at ${resolvedWatermark.toISOString()} ` +
              `and resetting stuck counter.`,
          });
          return { startedAt, nextWatermark: resolvedWatermark, nextStuckTicks: 0, pipelineResult };
        }

        // The watermark has not advanced for STUCK_TICK_LIMIT consecutive ticks and
        // we know the blocking episodes. Force-record them as `unmatched` so the
        // `.alert-actions` dedup mark moves past them, then advance the watermark.
        // If the batch was truncated, advance only to the truncation edge so the
        // tail (beyond EPISODE_QUERY_LIMIT) is re-read and also escape-hatched next tick.
        const truncated = pipelineResult.finalState.truncated ?? false;
        const lastEpisode = blockingEpisodes[blockingEpisodes.length - 1];
        const escapeTarget = truncated
          ? new Date(lastEpisode.last_event_timestamp)
          : input.windowEnd;
        // Clamp: never regress below the current watermark (guards against clock skew
        // producing a windowEnd behind resolvedWatermark).
        const clampedEscapeTarget = new Date(
          Math.max(escapeTarget.getTime(), resolvedWatermark.getTime())
        );

        logger.error({
          code: ALERTING_LOG_CODES.DISPATCHER_WATERMARK_STUCK,
          message: () =>
            `watermark stuck for ${STUCK_TICK_LIMIT} consecutive ticks ` +
            `(lag: ${lagMs}ms, blocking episodes: ${blockingEpisodes.length}, ` +
            `truncated: ${truncated}). ` +
            `Force-recording as unmatched and advancing to ${clampedEscapeTarget.toISOString()}.`,
          error: new Error(`Watermark stuck at ${resolvedWatermark.toISOString()}`),
        });

        try {
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
        } catch (writeErr) {
          const err = isError(writeErr) ? writeErr : new Error(String(writeErr));
          logger.error({
            error: err,
            code: ALERTING_LOG_CODES.DISPATCHER_ESCAPE_HATCH_WRITE_FAILED,
            message: () =>
              `escape hatch bulkIndexDocs failed; holding watermark so ` +
              `episodes will be retried. ${err.message}`,
          });
          // Do not advance: the records were not written, so dedup marks are absent.
          // Reset stuckTicks to avoid re-triggering the escape hatch every tick while
          // ES is unavailable.
          return { startedAt, nextWatermark: resolvedWatermark, nextStuckTicks: 0, pipelineResult };
        }

        return {
          startedAt,
          nextWatermark: clampedEscapeTarget,
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
