/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import moment from 'moment-timezone';
import { RRule } from '@kbn/rrule';
import type { DateRange } from '../../../common';
import type { MaintenanceWindow, Schedule } from '../types';
import {
  getDurationInMilliseconds,
  transformCustomScheduleToRRule,
} from '../../routes/schemas/schedule';

export interface GenerateMaintenanceWindowEventsParams {
  schedule: Schedule;
  expirationDate: string;
  duration: number;
  startDate?: string;
}

export const generateMaintenanceWindowEvents = ({
  schedule,
  expirationDate,
  duration,
  startDate,
}: GenerateMaintenanceWindowEventsParams) => {
  const { rRule } = transformCustomScheduleToRRule(schedule);
  const { dtstart, until, byweekday, ...rest } = rRule;

  const rRuleStartDate = new Date(dtstart);
  const endDate = new Date(expirationDate);

  const rRuleOptions = {
    ...rest,
    dtstart: rRuleStartDate,
    until: until ? new Date(until) : null,
    wkst: null,
    byweekday: byweekday ?? null,
  };

  try {
    const recurrenceRule = new RRule(rRuleOptions);
    const eventStartDate = startDate ? new Date(startDate) : rRuleStartDate;
    const occurrenceDates = recurrenceRule.between(eventStartDate, endDate);

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
  schedule,
  duration,
}: {
  maintenanceWindow: MaintenanceWindow;
  schedule?: Schedule;
  duration?: number;
}): boolean => {
  // If the schedule fails a deep equality check (there is a change), we should regenerate events
  const transformedDuration = getDurationInMilliseconds(maintenanceWindow.schedule.custom.duration);

  if (schedule && !_.isEqual(schedule, maintenanceWindow.schedule.custom)) {
    return true;
  }
  // If the duration changes, we should regenerate events
  if (typeof duration === 'number' && duration !== transformedDuration) {
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
