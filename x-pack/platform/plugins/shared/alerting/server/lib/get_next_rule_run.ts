/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { RRule } from '@kbn/rrule';
import { isIntervalSchedule, isRruleSchedule } from '@kbn/response-ops-scheduling-types';
import type { RuleSchedule } from '../../common';
import { parseDuration } from '../../common';

/**
 * Returns the next run time for a rule as an ISO 8601 string. Interval schedules add the
 * interval to the start date, rrule schedules take the first occurrence after it.
 */
export const getNextRuleRun = ({
  startDate = null,
  schedule,
}: {
  startDate?: Date | null;
  schedule: RuleSchedule;
}): string => {
  if (isIntervalSchedule(schedule)) {
    return moment(startDate || new Date())
      .add(parseDuration(schedule.interval), 'ms')
      .toISOString();
  }

  if (isRruleSchedule(schedule)) {
    const { dtstart, ...rrule } = schedule.rrule;
    const from = startDate || new Date();
    // RRule.after is inclusive, so step past the start date to get the following occurrence
    // instead of the one landing on it.
    // Mirror how Task Manager builds the rrule so nextRun matches the task's real run time:
    // an explicit dtstart is used as is, otherwise start from now pinned to the start of the
    // minute. See task_manager/server/lib/get_first_run_at.ts.
    const nextRun = new RRule(
      dtstart
        ? { ...rrule, dtstart: new Date(dtstart) }
        : { ...rrule, dtstart: new Date(), bysecond: [0] }
    ).after(new Date(from.getTime() + 1));

    if (!nextRun) {
      throw new Error('Rrule schedule has no occurrence after the given start date');
    }

    return nextRun.toISOString();
  }

  throw new Error('Schedule is neither an interval nor an rrule, unable to calculate next run');
};
