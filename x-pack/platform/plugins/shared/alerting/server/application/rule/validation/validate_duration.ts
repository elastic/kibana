/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SECONDS_REGEX = /^[1-9][0-9]*s$/;
const MINUTES_REGEX = /^[1-9][0-9]*m$/;
const HOURS_REGEX = /^[1-9][0-9]*h$/;
const DAYS_REGEX = /^[1-9][0-9]*d$/;

export function validateDuration(duration: string) {
  if (duration.match(SECONDS_REGEX)) {
    return;
  }
  if (duration.match(MINUTES_REGEX)) {
    return;
  }
  if (duration.match(HOURS_REGEX)) {
    return;
  }
  if (duration.match(DAYS_REGEX)) {
    return;
  }
  return 'string is not a valid duration: ' + duration;
}
