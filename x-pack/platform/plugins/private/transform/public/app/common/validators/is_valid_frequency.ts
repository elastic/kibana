/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { ParsedDuration } from './types';

// only valid if value is up to 1 hour
export function isValidFrequency(arg: unknown): arg is ParsedDuration {
  if (!isPopulatedObject(arg, ['number', 'timeUnit'])) {
    return false;
  }

  const { number, timeUnit } = arg;

  if (typeof number !== 'number' || typeof timeUnit !== 'string') {
    return false;
  }

  return (
    (timeUnit === 's' && number <= 3600) ||
    (timeUnit === 'm' && number <= 60) ||
    (timeUnit === 'h' && number === 1)
  );
}
