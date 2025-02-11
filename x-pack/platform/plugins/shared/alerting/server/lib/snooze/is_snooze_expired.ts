/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule, Weekday } from '@kbn/rrule';
import { RuleSnoozeSchedule } from '../../types';
import { getActiveSnoozeIfExist } from './get_active_snooze_if_exist';

export function isSnoozeExpired(snooze: RuleSnoozeSchedule) {
  if (getActiveSnoozeIfExist(snooze)) {
    return false;
  }
  const now = Date.now();
  const { rRule } = snooze;
  // Check to see if the snooze has another upcoming occurrence in the future

  try {
    const rRuleOptions = {
      ...rRule,
      dtstart: new Date(rRule.dtstart),
      until: rRule.until ? new Date(rRule.until) : null,
      byweekday: rRule.byweekday ?? null,
      wkst: rRule.wkst ? Weekday[rRule.wkst] : null,
    };

    const recurrenceRule = new RRule(rRuleOptions);
    const nextOccurrence = recurrenceRule.after(new Date(now));
    return !nextOccurrence;
  } catch (e) {
    throw new Error(`Failed to process RRule ${rRule}: ${e}`);
  }
}
