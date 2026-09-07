/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { CustomDurationState } from '../components/types';

export interface DurationValidation {
  isDurationInvalid: boolean;
  isPastDateTime: boolean;
  isDateTimeMissing: boolean;
}

export const validateDuration = (duration: CustomDurationState | null): DurationValidation => {
  if (duration === null) {
    return { isDurationInvalid: false, isPastDateTime: false, isDateTimeMissing: false };
  }

  const isDurationInvalid =
    duration.mode === 'duration' && (duration.value < 1 || !Number.isInteger(duration.value));

  const isPastDateTime =
    duration.mode === 'datetime' &&
    duration.dateTime !== null &&
    duration.dateTime.isBefore(moment());

  const isDateTimeMissing = duration.mode === 'datetime' && duration.dateTime === null;

  return { isDurationInvalid, isPastDateTime, isDateTimeMissing };
};

/**
 * Converts a CustomDurationState to an ISO end-date string.
 * Returns null when duration is null, or when datetime mode has no date selected.
 */
export const computeEndDate = (duration: CustomDurationState | null): string | null => {
  if (duration === null) return null;
  if (duration.mode === 'datetime') {
    return duration.dateTime ? duration.dateTime.toISOString() : null;
  }
  return moment().add(duration.value, duration.unit).toISOString();
};
