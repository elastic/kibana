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
import { toAction } from './steps/utils/action_builders';
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
      // Only reachable when the persisted watermark sits more than OVERLAP_WINDOW_MINUTES ahead
      // of the current clock — node clock skew, or corrupt task state.
      logger.debug({
        message: () =>
          `windowEnd (${windowEnd.toISOString()}) ≤ windowStart ` +
          `(${windowStart.toISOString()}); skipping scan.`,
      });
      return {
        startedAt,
        nextWatermark: resolvedWatermark,
        // Carried forward, not acted on here: the hatch lives past this early return, so it
        // can only fire once the clock catches up and the scan resumes.
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

    // AbortSignal.any / AbortSignal.timeout are absent in the jsdom test env, so the TM signal
    // and the TICK_DEADLINE_MS deadline are merged by hand.
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
      // StoreActionsStep may not have run on abort; DispatchStep's per-chunk firedEpisodes still
      // proves progress, so a partial-dispatch tick resets the stuck counter. Known limitation:
      // this is aggregate — progress in any apiKey batch resets it, so chronically unreachable
      // groups in later batches never reach the hatch. They are not lost (an aborted tick holds
      // the watermark).
      const recordedEpisodes =
        pipelineResult.finalState.recordedEpisodes ?? pipelineResult.finalState.firedEpisodes ?? 0;
      const watermarkHeld = nextWatermark.getTime() === resolvedWatermark.getTime();
      const isStuck = watermarkHeld && recordedEpisodes === 0;
      const nextStuckTicks = isStuck ? stuckTicks + 1 : 0;

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

        const stoppedBeforeFetch = blockingEpisodes.length === 0;
        if (stoppedBeforeFetch) {
          // Nothing was fetched, so advancing would silently drop the window. Hold while lag
          // stays within one scan window to let transient infra pressure recover; past that,
          // skip the unread window rather than stall forever.
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

        // Force-record as `unmatched` so the `.alert-actions` dedup mark moves past these
        // episodes. When truncated, advance only to the truncation edge so the tail beyond
        // EPISODE_QUERY_LIMIT is re-read and hatched next tick. Episodes already fire-recorded
        // by a partial-dispatch tick get a redundant row — same last_series_event_timestamp,
        // so the dedup MAX is unchanged.
        const truncated = pipelineResult.finalState.truncated ?? false;
        const lastEpisode = blockingEpisodes[blockingEpisodes.length - 1];
        const escapeTarget = truncated
          ? new Date(lastEpisode.last_event_timestamp)
          : input.windowEnd;
        // Never regress: windowEnd can trail the watermark under clock skew, and the
        // truncation edge can fall inside the overlap re-read.
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
          // Records were not written, so the dedup marks are absent — hold. Reset the counter
          // so the hatch does not re-fire every tick while ES is unavailable.
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
