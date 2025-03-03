/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { DURATION_REGEX, INTERVAL_FREQUENCY_REGEXP } from '../../constants';

export const validateSchedule = (schedule: {
  duration: string;
  recurring?: { every?: string };
}) => {
  const { duration, recurring } = schedule;
  if (recurring?.every && duration !== '-1') {
    const [, interval, frequency] = recurring?.every?.match(INTERVAL_FREQUENCY_REGEXP) ?? [];
    const [, durationNumber, durationUnit] = duration.match(DURATION_REGEX) ?? [];

    const intervalInDays = moment
      .duration(interval, frequency as moment.unitOfTime.DurationConstructor)
      .asDays();

    const durationInDays = moment
      .duration(durationNumber, durationUnit as moment.unitOfTime.DurationConstructor)
      .asDays();

    if (intervalInDays && interval && durationInDays >= intervalInDays) {
      return `Recurrence every ${recurring?.every} must be longer than the duration ${duration}`;
    }
  }

  if (duration === '-1' && recurring) {
    return `The duration of -1 represents indefinite schedule. Recurring schedules cannot be set when the duration is -1.`;
  }

  return;
};
