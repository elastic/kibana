/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule } from '@kbn/rrule';
import type { Logger } from '@kbn/core/server';
import { intervalFromDate } from './intervals';
import type { ConcreteTaskInstance } from '../task';

export function getNextRunAt(
  { runAt, startedAt, schedule }: Pick<ConcreteTaskInstance, 'runAt' | 'startedAt' | 'schedule'>,
  taskDelayThresholdForPreciseScheduling: number = 0,
  logger: Logger
): Date {
  const taskDelay = startedAt!.getTime() - runAt.getTime();
  const scheduleFromDate = taskDelay < taskDelayThresholdForPreciseScheduling ? runAt : startedAt!;

  const { rrule, interval } = schedule || {};
  let nextCalculatedRunAt: number;

  try {
    let nextRunAt: Date | undefined | null;

    if (interval) {
      nextRunAt = intervalFromDate(scheduleFromDate, interval);
    } else if (rrule) {
      const _rrule = new RRule({
        ...rrule,
        dtstart: scheduleFromDate,
      });
      // adding 1ms to ensure the next run is always in the future
      // if scheduleFromDate is equal to now (very low possibility), the next run will be now again, which causes loops
      nextRunAt = _rrule.after(new Date(Date.now() + 1));
    }
    // Ensure we also don't schedule in the past by performing the Math.max with Date.now
    nextCalculatedRunAt = Math.max(nextRunAt!.getTime(), Date.now());
  } catch (e) {
    logger.error(
      `The next runAt for the task with a fixed time schedule could not be calculated: ${e}`
    );
    throw e;
  }

  return new Date(nextCalculatedRunAt);
}
