/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { inject, injectable } from 'inversify';
import { v4 as uuidV4 } from 'uuid';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import type { DispatcherExecutionParams, DispatcherExecutionResult } from './types';
import type { AlertAction } from '../../resources/datastreams/alert_actions';
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
        nextStuckTicks: 0,
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
          await this.storageService.bulkIndexDocs<AlertAction>({
            index: ALERT_ACTIONS_DATA_STREAM,
            docs: blockingEpisodes.map((episode) => ({
              '@timestamp': escapeNow.toISOString(),
              group_hash: episode.group_hash,
              last_series_event_timestamp: episode.last_event_timestamp,
              actor: 'system',
              action_type: 'unmatched',
              rule_id: episode.rule_id,
              source: episode.source,
              reason: 'watermark-stuck escape hatch; episode force-recorded as unmatched',
              space_id: episode.space_id,
            })),
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
