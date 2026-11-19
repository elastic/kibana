/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  getNextRruleOccurrence,
  isIntervalSchedule,
  isRruleSchedule,
} from '@kbn/response-ops-scheduling-utils';
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
    const nextRun = getNextRruleOccurrence(schedule.rrule, startDate || new Date());

    if (!nextRun) {
      throw new Error('Rrule schedule has no occurrence after the given start date');
    }

    return nextRun.toISOString();
  }

  throw new Error('Schedule is neither an interval nor an rrule, unable to calculate next run');
};
