/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const YEARLY_REGEX = /^[1-9][0-9]*y$/;
const MONTHLY_REGEX = /^[1-9][0-9]*M$/;
const WEEKLY_REGEX = /^[1-9][0-9]*w$/;
const DAILY_REGEX = /^[1-9][0-9]*d$/;
const HOURLY_REGEX = /^[1-9][0-9]*h$/;
const MINUTELY_REGEX = /^[1-9][0-9]*m$/;
const SECONDLY_REGEX = /^[1-9][0-9]*s$/;

export function validateIntervalAndFrequency(every: string) {
  if (every.match(YEARLY_REGEX)) {
    return;
  }
  if (every.match(MONTHLY_REGEX)) {
    return;
  }
  if (every.match(WEEKLY_REGEX)) {
    return;
  }
  if (every.match(DAILY_REGEX)) {
    return;
  }
  if (every.match(HOURLY_REGEX)) {
    return;
  }
  if (every.match(MINUTELY_REGEX)) {
    return;
  }
  if (every.match(SECONDLY_REGEX)) {
    return;
  }
  return 'string is not a valid every of recurring schedule: ' + every;
}
