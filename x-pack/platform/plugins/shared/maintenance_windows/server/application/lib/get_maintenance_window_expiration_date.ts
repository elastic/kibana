/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { Schedule } from '../types';
import { getDurationInMilliseconds } from '../../lib/transforms/custom_to_rrule/util';

// Returns a date in ISO format one year in the future if the rule is recurring or until the end of the MW if it is not recurring.
export const getMaintenanceWindowExpirationDate = ({
  schedule,
}: {
  schedule: Schedule;
}): string => {
  let expirationDate;
  const durationInMilliseconds = getDurationInMilliseconds(schedule.duration);
  const { recurring, start } = schedule;
  if (recurring) {
    expirationDate = moment().utc().add(1, 'year').toISOString();
  } else {
    expirationDate = moment(start).utc().add(durationInMilliseconds, 'ms').toISOString();
  }

  return expirationDate;
};
