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
import { EpisodeScan } from './state';
import { toAction } from './steps/store_actions_step';
import type {
  DispatcherExecutionParams,
  DispatcherExecutionResult,
  DispatcherPipelineInput,
  DispatcherPipelineResult,
} from './types';
import { computeNextWatermark } from './watermark';

const NEVER_ABORTED = new AbortController().signal;

const isValidDate = (d: Date | undefined): d is Date =>
  d instanceof Date && !Number.isNaN(d.getTime());

// AbortSignal.timeout / AbortSignal.any are unavailable in the jsdom test env,
// so the deadline is wired manually.
const combineSignalWithDeadline = (
  signal: AbortSignal
): { signal: AbortSignal; deadlineExceeded: () => boolean; cleanup: () => void } => {
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

  return {
    signal: tickController.signal,
    deadlineExceeded: () => deadlineController.signal.aborted,
    cleanup: () => {
      clearTimeout(deadlineTimer);
      signal.removeEventListener('abort', abortTick);
      deadlineController.signal.removeEventListener('abort', abortTick);
    },
  };
};

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

    const resolvedWatermark = this.resolveWatermark({ eventWatermark, startedAt, logger });
    const windowStart = new Date(resolvedWatermark.getTime() - OVERLAP_WINDOW_MINUTES * 60_000);
    const maxEnd = new Date(windowStart.getTime() + MAX_WINDOW_MINUTES * 60_000);
    const settled = new Date(startedAt.getTime() - SETTLE_BUFFER_SECONDS * 1_000);
    const windowEnd = maxEnd < settled ? maxEnd : settled;

    const { signal: tickSignal, deadlineExceeded, cleanup } = combineSignalWithDeadline(signal);

    try {
      const input: DispatcherPipelineInput = {
        startedAt,
        eventWatermark: resolvedWatermark,
        windowStart,
        windowEnd,
        executionUuid: uuidV4(),
        signal: tickSignal,
      };
      const pipelineResult = await this.pipeline.execute(input, logger);

      if (pipelineResult.haltReason === 'aborted') {
        if (deadlineExceeded()) {
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
      const scan = pipelineResult.finalState.scan ?? EpisodeScan.empty();

      logger.debug({
        message: () => {
          const watermarkLagMs = startedAt.getTime() - nextWatermark.getTime();
          const windowSpanMs = windowEnd.getTime() - windowStart.getTime();
          return [
            'tick:',
            `halt_reason=${pipelineResult.haltReason ?? 'completed'}`,
            `watermark_lag_ms=${watermarkLagMs}`,
            `window_span_ms=${windowSpanMs}`,
            `truncated=${scan.truncated}`,
            `episode_count=${scan.episodes.length}`,
            `stuck_ticks=${nextStuckTicks}`,
          ].join(' ');
        },
      });

      if (nextStuckTicks >= STUCK_TICK_LIMIT) {
        return await this.escapeStuckWatermark({ input, pipelineResult, logger });
      }

      return {
        startedAt,
        nextWatermark,
        nextStuckTicks,
        pipelineResult,
      };
    } finally {
      cleanup();
    }
  }

  private resolveWatermark({
    eventWatermark,
    startedAt,
    logger,
  }: {
    eventWatermark: Date | undefined;
    startedAt: Date;
    logger: LoggerServiceContract;
  }): Date {
    if (isValidDate(eventWatermark)) {
      return eventWatermark;
    }

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
    return new Date(startedAt.getTime() - OVERLAP_WINDOW_MINUTES * 60_000);
  }

  /**
   * The watermark has not advanced for STUCK_TICK_LIMIT consecutive ticks:
   * force-record the blocking episodes as `unmatched` so the `.alert-actions`
   * dedup mark moves past them, then advance the watermark.
   */
  private async escapeStuckWatermark({
    input,
    pipelineResult,
    logger,
  }: {
    input: DispatcherPipelineInput;
    pipelineResult: DispatcherPipelineResult;
    logger: LoggerServiceContract;
  }): Promise<DispatcherExecutionResult> {
    const { startedAt, eventWatermark, windowEnd } = input;
    const blockingEpisodes = pipelineResult.finalState.scan?.episodes ?? [];
    const lagMs = startedAt.getTime() - eventWatermark.getTime();

    if (blockingEpisodes.length === 0) {
      // Stuck before FetchEpisodesStep: nothing to force-record, and advancing
      // would silently drop the window. Hold while lag is within one max scan
      // window so transient infra pressure can recover; past that, skip the
      // unread window rather than stall forever.
      if (lagMs > PRE_FETCH_STUCK_ADVANCE_LAG_MS) {
        logger.error({
          code: ALERTING_LOG_CODES.DISPATCHER_ESCAPE_HATCH_PRE_FETCH_FORCED_ADVANCE,
          message: () =>
            `escape hatch triggered but pipeline stopped before FetchEpisodesStep ` +
            `(lag: ${lagMs}ms > ${MAX_WINDOW_MINUTES}m). Force-advancing to ` +
            `${windowEnd.toISOString()}; unread episodes in this window are skipped.`,
          error: new Error(`Pre-fetch watermark stuck at ${eventWatermark.toISOString()}`),
        });
        return { startedAt, nextWatermark: windowEnd, nextStuckTicks: 0, pipelineResult };
      }

      logger.warn({
        code: ALERTING_LOG_CODES.DISPATCHER_ESCAPE_HATCH_PRE_FETCH_STUCK,
        message: () =>
          `escape hatch triggered but pipeline stopped before FetchEpisodesStep ` +
          `(lag: ${lagMs}ms). Holding watermark at ${eventWatermark.toISOString()} ` +
          `and resetting stuck counter.`,
      });
      return { startedAt, nextWatermark: eventWatermark, nextStuckTicks: 0, pipelineResult };
    }

    // On a truncated batch, advance only to the truncation edge so the tail
    // (beyond EPISODE_QUERY_LIMIT) is re-read and also escape-hatched next tick.
    // The edge can sit at or behind the watermark (that is what made a truncated
    // tick stuck) — clamp so the watermark never regresses; progress then comes
    // from the dedup marks written below.
    const truncated = pipelineResult.finalState.scan?.truncated ?? false;
    const lastEpisode = blockingEpisodes[blockingEpisodes.length - 1];
    const escapeTarget = truncated ? new Date(lastEpisode.last_event_timestamp) : windowEnd;
    const clampedEscapeTarget = new Date(
      Math.max(escapeTarget.getTime(), eventWatermark.getTime())
    );

    logger.error({
      code: ALERTING_LOG_CODES.DISPATCHER_WATERMARK_STUCK,
      message: () =>
        `watermark stuck for ${STUCK_TICK_LIMIT} consecutive ticks ` +
        `(lag: ${lagMs}ms, blocking episodes: ${blockingEpisodes.length}, ` +
        `truncated: ${truncated}). ` +
        `Force-recording as unmatched and advancing to ${clampedEscapeTarget.toISOString()}.`,
      error: new Error(`Watermark stuck at ${eventWatermark.toISOString()}`),
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
      // Reset stuckTicks so the hatch does not re-fire (and re-attempt the bulk
      // write) every tick while ES is unavailable.
      return { startedAt, nextWatermark: eventWatermark, nextStuckTicks: 0, pipelineResult };
    }

    return {
      startedAt,
      nextWatermark: clampedEscapeTarget,
      nextStuckTicks: 0,
      pipelineResult,
    };
  }
}
