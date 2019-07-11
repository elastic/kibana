/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

enum TIME_UNIT {
  SECONDS = 's',
  MINUTES = 'm',
  HOURS = 'h',
  DAYS = 'd',
}

const multipliers = {
  [TIME_UNIT.SECONDS]: 1000,
  [TIME_UNIT.MINUTES]: 1000 * 60,
  [TIME_UNIT.HOURS]: 1000 * 60 * 60,
  [TIME_UNIT.DAYS]: 1000 * 60 * 60 * 24,
};

function isTimeUnit(unit: string): unit is TIME_UNIT {
  return (unit as TIME_UNIT) !== undefined;
}

export const isValidTimeInterval = (val = ''): boolean => {
  return !!String(val).match(/^([0-9]{1,})([hmsd])$/);
};

export const getTimeInterval = (val = ''): number | undefined => {
  // if it's a number, there is no interval, return undefined
  if (!isNaN(Number(val))) {
    return;
  }

  // if it's a string, try to parse out the shorthand duration value
  const match = String(val).match(/^([0-9]{1,})([hmsd])$/);

  // if it's invalid, there is no interval, return undefined
  if (!match) {
    return;
  }

  const interval = parseInt(match[1], 10);
  const unit = match[2];
  const multiplier = isTimeUnit(unit) ? multipliers[unit] : null;

  if (interval && multiplier) {
    return interval * multiplier;
  }
};

export const createTimeInterval = (seconds: number): string => {
  if (seconds < multipliers[TIME_UNIT.MINUTES]) {
    return seconds / multipliers[TIME_UNIT.SECONDS] + TIME_UNIT.SECONDS;
  }

  if (seconds < multipliers[TIME_UNIT.HOURS]) {
    return seconds / multipliers[TIME_UNIT.MINUTES] + TIME_UNIT.MINUTES;
  }

  if (seconds < multipliers[TIME_UNIT.DAYS]) {
    return seconds / multipliers[TIME_UNIT.HOURS] + TIME_UNIT.HOURS;
  }

  return seconds / multipliers[TIME_UNIT.DAYS] + TIME_UNIT.DAYS;
};
