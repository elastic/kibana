/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule } from '@kbn/rrule';
import moment from 'moment';
import { parseDuration, type RuleSchedule } from '../../common';

export function getNextRuleRun({
  startDate,
  schedule,
}: {
  startDate: Date | null;
  schedule: RuleSchedule;
}): string {
  const { rrule, interval } = schedule || {};

  if (interval) {
    return moment(startDate || new Date())
      .add(parseDuration(interval), 'ms')
      .toISOString();
  } else if (rrule) {
    const _rrule = new RRule({
      ...rrule,
      dtstart: startDate ? new Date(startDate) : new Date(),
    });

    const nextRun = _rrule.after(new Date());

    if (nextRun) {
      return nextRun.toISOString();
    }
  }

  throw new Error('Invalid schedule, unable to calculate next run');
}
