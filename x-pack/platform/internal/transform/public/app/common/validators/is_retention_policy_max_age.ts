/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { parseDurationAboveZero } from './parse_duration_above_zero';

const RETENTION_POLICY_MIN_AGE_SECONDS = 60;

export function isRetentionPolicyMaxAge(arg: unknown): boolean {
  const parsedArg = parseDurationAboveZero(arg);

  if (!isPopulatedObject(parsedArg, ['number', 'timeUnit'])) {
    return false;
  }

  const { number, timeUnit } = parsedArg;

  if (typeof number !== 'number' || typeof timeUnit !== 'string') {
    return false;
  }

  // only valid if value is equal or more than 60s
  // supported time units: https://www.elastic.co/guide/en/elasticsearch/reference/master/common-options.html#time-units
  return (
    (timeUnit === 'nanos' && number >= RETENTION_POLICY_MIN_AGE_SECONDS * 1000000000) ||
    (timeUnit === 'micros' && number >= RETENTION_POLICY_MIN_AGE_SECONDS * 1000000) ||
    (timeUnit === 'ms' && number >= RETENTION_POLICY_MIN_AGE_SECONDS * 1000) ||
    (timeUnit === 's' && number >= RETENTION_POLICY_MIN_AGE_SECONDS) ||
    ((timeUnit === 'm' || timeUnit === 'h' || timeUnit === 'd') && number >= 1)
  );
}
