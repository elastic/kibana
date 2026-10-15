/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Valid time units for Elastic Agent duration fields: milliseconds, seconds, minutes, hours
const DURATION_REGEX = /^\d+(ms|s|m|h)$/;

export const isValidDuration = (value: string): boolean => DURATION_REGEX.test(value);

// Valid time units for ES Security API enrollment key expiration: days, hours, minutes, seconds.
// Requires a positive (non-zero) integer so callers can't create an already-expired token.
export const ES_ENROLLMENT_KEY_DURATION_REGEX = /^[1-9]\d*(d|h|m|s)$/;

// Maximum values per unit derived from ES TimeValue ceiling: Long.MAX_VALUE nanoseconds ≈ 106,751 days
const ES_ENROLLMENT_KEY_MAX_BY_UNIT: Record<string, number> = {
  d: 106751,
  h: 2562024,
  m: 153721440,
  s: 9223286400,
};

export const isValidEnrollmentKeyExpiration = (value: string): boolean => {
  if (!ES_ENROLLMENT_KEY_DURATION_REGEX.test(value)) return false;
  const unit = value[value.length - 1];
  const amount = parseInt(value.slice(0, -1), 10);
  return amount <= ES_ENROLLMENT_KEY_MAX_BY_UNIT[unit];
};
