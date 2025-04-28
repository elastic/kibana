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
      const rrule = new RRule({
        ...taskInstance.schedule.rrule,
        bysecond: [0],
        dtstart: now,
      });
      return rrule.after(now)?.toISOString() || nowString;
    } catch (e) {
      logger.error(`runAt for the rrule with fixed time could not be calculated: ${e}`);
    }
  }

  return nowString;
}

function rruleHasFixedTime(schedule: RruleSchedule['rrule']): boolean {
  const keys = Object.keys(schedule);
  const baseFields = ['freq', 'interval', 'tzid'];

  if (keys.length === 3 && keys.every((key) => baseFields.includes(key))) {
    return false;
  }

  return true;
}
