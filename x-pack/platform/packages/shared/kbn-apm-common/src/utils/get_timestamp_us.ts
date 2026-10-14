/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimestampUs } from '@kbn/apm-types';
import { isFiniteNumber } from './is_finite_number';

interface DocumentWithTimestampUs {
  timestamp: TimestampUs;
}

/**
 * Safely extracts `timestamp.us` from an APM document,
 * returning 0 when the field is missing or not a valid number.
 */
export const getTimestampUs = (document?: DocumentWithTimestampUs): number => {
  const value = Number(document?.timestamp?.us);
  return isFiniteNumber(value) ? value : 0;
};
