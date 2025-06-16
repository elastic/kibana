/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import moment from 'moment-timezone';
import { RRule, Weekday } from 'rrule-es';
import { migrateRRuleParams } from '@kbn/rrule';
import type { RRuleParams, DateRange } from '../../../../common';
import type { MaintenanceWindow } from '../types';

export interface GenerateMaintenanceWindowEventsParams {
  rRule: RRuleParams;
  expirationDate: string;
  duration: number;
}

export const generateMaintenanceWindowEvents = ({
  rRule,
  expirationDate,
  duration,
}: GenerateMaintenanceWindowEventsParams) => {
  const { dtstart, until, wkst, byweekday, ...rest } = rRule;

  const startDate = new Date(dtstart);
  const endDate = new Date(expirationDate);

  const rRuleOptions = migrateRRuleParams({
    ...rest,
    dtstart: startDate,
    until: until ? new Date(until) : null,
    wkst: wkst ? Weekday[wkst] : null,
    byweekday: byweekday ?? null,
  });

  try {
    // Maintenance window start date sometimes does not match the maintenance window schedule, e.g. if today is Friday and the
    // user creates a schedule to run on Saturday and Sunday. Use RRule.strict to make sure we exclude the start date if it
    // does not match the schedule
    const recurrenceRule = RRule.strict(rRuleOptions);
    const occurrenceDates = recurrenceRule.between(startDate, endDate, { inclusive: true });

    return occurrenceDates.map((date) => {
      return {
        gte: date.toISOString(),
        lte: moment(date).add(duration, 'ms').toISOString(),
      };
    });
  } catch (e) {
    throw new Error(`Failed to process RRule ${rRule}. Error: ${e}`);
  }
};

/**
 * Checks to see if we should regenerate maintenance window events.
 * Don't regenerate old events if the underlying RRule/duration did not change.
 */
export const shouldRegenerateEvents = ({
  maintenanceWindow,
  rRule,
  duration,
}: {
  maintenanceWindow: MaintenanceWindow;
  rRule?: RRuleParams;
  duration?: number;
}): boolean => {
  // If the rRule fails a deep equality check (there is a change), we should regenerate events
  if (rRule && !_.isEqual(rRule, maintenanceWindow.rRule)) {
    return true;
  }
  // If the duration changes, we should regenerate events
  if (typeof duration === 'number' && duration !== maintenanceWindow.duration) {
    return true;
  }
  return false;
};

/**
 * Updates and merges the old events with the new events to preserve old modified events,
 * Unless the maintenance window was archived, then the old events are trimmed.
 */
export const mergeEvents = ({
  oldEvents,
  newEvents,
}: {
  oldEvents: DateRange[];
  newEvents: DateRange[];
}) => {
  // If new events have more entries (expiration date got pushed), we merge the old into the new
  if (newEvents.length > oldEvents.length) {
    return [...oldEvents, ...newEvents.slice(-(newEvents.length - oldEvents.length))];
  }
  // If new events have less entries (maintenance window got archived), we trim the old events
  if (oldEvents.length > newEvents.length) {
    return oldEvents.slice(0, newEvents.length);
  }
  return oldEvents;
};
