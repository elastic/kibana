/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule } from '@kbn/rrule';
import moment from 'moment';
import { isIntervalSchedule, isRruleSchedule } from '@kbn/response-ops-scheduling-types';
import { parseDuration, type RuleSchedule } from '../../common';

/**
 * Computes the next run time for a rule from a given start date and schedule.
 * Supports interval-based schedules (adds the interval to the start date) and
 * RRule-based schedules (uses the rrule to find the next occurrence after the start date).
 *
 * @returns The next run time as an ISO 8601 string.
 * @throws Error if the schedule is neither a valid interval nor an rrule schedule.
 */
export function getNextRuleRun({
  startDate = null,
  schedule,
}: {
  startDate?: Date | null;
  schedule: RuleSchedule;
}): string {
  if (isIntervalSchedule(schedule)) {
    return moment(startDate || new Date())
      .add(parseDuration(schedule.interval), 'ms')
      .toISOString();
  } else if (isRruleSchedule(schedule)) {
    const _rrule = new RRule({
      ...schedule.rrule,
      dtstart: schedule.rrule.dtstart ? new Date(schedule.rrule.dtstart) : new Date(),
    });

    const nextRun = _rrule.after(startDate ? new Date(startDate) : new Date());

    if (nextRun) {
      return nextRun.toISOString();
    }
  }

  throw new Error('Invalid schedule, unable to calculate next run');
}
