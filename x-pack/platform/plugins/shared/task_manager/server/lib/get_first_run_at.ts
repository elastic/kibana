/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule } from '@kbn/rrule';
import type { Logger } from '@kbn/core/server';
import type { RruleSchedule, TaskInstance } from '../task';

export function getFirstRunAt({
  taskInstance,
  logger,
}: {
  taskInstance: TaskInstance;
  logger: Logger;
}): string {
  if (taskInstance.runAt) {
    return taskInstance.runAt.toISOString();
  }
  const now = new Date();
  const nowString = now.toISOString();

  if (taskInstance.schedule?.rrule && rruleHasFixedTime(taskInstance.schedule.rrule)) {
    try {
      const rrule = taskInstance.schedule.rrule.dtstart
        ? new RRule({
            ...taskInstance.schedule.rrule,
            // when "dtstart" is provided, we use as-is with no overrides
            dtstart: new Date(taskInstance.schedule.rrule.dtstart),
          })
        : new RRule({
            ...taskInstance.schedule.rrule,
            // when "dtstart" is not provided, we use the current time as the start but
            // override the seconds to 0 to ensure the first run is at the start of the minute
            dtstart: now,
            bysecond: [0],
          });
      return rrule.after(now)?.toISOString() || nowString;
    } catch (e) {
      logger.error(`runAt for the rrule with fixed time could not be calculated: ${e}`);
    }
  }

  return nowString;
}

// This function checks if the rrule has fixed time by checking if it has any fields other than
// 'freq', 'interval', and 'tzid'. If it does, it means the rrule has fixed time.
// The first run of a rule that has a fixed time has to be on the expected time,
// therefore should be calculated using the rrule library, otherwise it can be `now`.
function rruleHasFixedTime(schedule: RruleSchedule['rrule']): boolean {
  const keys = Object.keys(schedule);
  const baseFields = ['freq', 'interval', 'tzid'];

  if (keys.length === baseFields.length && keys.every((key) => baseFields.includes(key))) {
    return false;
  }

  return true;
}
