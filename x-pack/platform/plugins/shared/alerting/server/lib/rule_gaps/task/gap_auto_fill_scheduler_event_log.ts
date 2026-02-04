/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { EVENT_LOG_ACTIONS } from '../../../plugin';
import type { SchedulerSoAttributes } from '../../../application/gaps/types/scheduler';
import type { GapAutoFillStatus } from '../../../../common/constants';

export interface GapAutoFillExecutionResult {
  ruleId: string;
  processedGaps: number;
  status: Extract<GapAutoFillStatus, 'success' | 'error'>;
  error?: string;
}

export interface GapAutoFillLogEventParams {
  status: GapAutoFillStatus;
  results?: GapAutoFillExecutionResult[];
  message: string;
}

export type GapAutoFillSchedulerEventLogger = (params: GapAutoFillLogEventParams) => void;

export interface CreateGapAutoFillSchedulerEventLoggerArgs {
  eventLogger: IEventLogger;
  context: { spaceId: string };
  taskInstance: { id: string; scheduledAt: Date; state?: Record<string, unknown> };
  startTime: Date;
  config: SchedulerSoAttributes;
}

export function createGapAutoFillSchedulerEventLogger({
  eventLogger,
  context,
  taskInstance,
  startTime,
  config,
}: CreateGapAutoFillSchedulerEventLoggerArgs): GapAutoFillSchedulerEventLogger {
  return ({ status, results = [], message }: GapAutoFillLogEventParams) => {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const ruleIds = new Set<string>();
    results.forEach((result) => ruleIds.add(result.ruleId));

    eventLogger.logEvent({
      event: { action: EVENT_LOG_ACTIONS.gapAutoFillSchedule },
      kibana: {
        space_ids: [context.spaceId],
        task: {
          id: taskInstance.id,
          scheduled: taskInstance.scheduledAt.toISOString(),
          schedule_delay: startTime.getTime() - taskInstance.scheduledAt.getTime(),
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'task',
            id: taskInstance.id,
          },
        ],
        gap_auto_fill: {
          execution: {
            status,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            duration_ms: duration,
            rule_ids: Array.from(ruleIds),
            task_params: {
              name: config.name,
              num_retries: config.numRetries,
              gap_fill_range: config.gapFillRange,
              interval: config.schedule.interval,
              max_backfills: config.maxBackfills,
            },
            results:
              results?.map((result) => ({
                rule_id: result.ruleId,
                processed_gaps: result.processedGaps,
                status: result.status,
                error: result.error,
              })) ?? [],
          },
        },
      },
      message,
    });
  };
}
