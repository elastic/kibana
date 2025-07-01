/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';
import type { SeverityThreshold } from '../../../../../common/types/anomalies';

/**
 * Utility function to resolve severity format from old to new format
 * @param value - The severity value which could be in old (number) or new (array) format
 * @returns Resolved severity value in the new format (array)
 */
export const resolveSeverityFormat = (value: number | SeverityThreshold[]): SeverityThreshold[] => {
  // Check if this is the old format (single number instead of array)
  if (typeof value === 'number') {
    // Convert old single number format to new array format
    // Create thresholds for all severity levels >= the provided value
    const thresholds: SeverityThreshold[] = [];

    // Add thresholds based on the ML_ANOMALY_THRESHOLD constants
    if (value <= ML_ANOMALY_THRESHOLD.LOW) {
      thresholds.push({ min: ML_ANOMALY_THRESHOLD.LOW, max: ML_ANOMALY_THRESHOLD.WARNING });
    }

    if (value <= ML_ANOMALY_THRESHOLD.WARNING) {
      thresholds.push({ min: ML_ANOMALY_THRESHOLD.WARNING, max: ML_ANOMALY_THRESHOLD.MINOR });
    }

    if (value <= ML_ANOMALY_THRESHOLD.MINOR) {
      thresholds.push({ min: ML_ANOMALY_THRESHOLD.MINOR, max: ML_ANOMALY_THRESHOLD.MAJOR });
    }

    if (value <= ML_ANOMALY_THRESHOLD.MAJOR) {
      thresholds.push({ min: ML_ANOMALY_THRESHOLD.MAJOR, max: ML_ANOMALY_THRESHOLD.CRITICAL });
    }

    if (value <= ML_ANOMALY_THRESHOLD.CRITICAL) {
      thresholds.push({ min: ML_ANOMALY_THRESHOLD.CRITICAL });
    }

    return thresholds;
  }

  // Already in new format
  return value;
};
