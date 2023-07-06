/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';
import { ML_SEVERITY_COLORS } from './severity_colors';

/**
 * Returns a severity RGB color (one of critical, major, minor, warning, low or blank)
 * for the supplied normalized anomaly score (a value between 0 and 100).
 * @param normalizedScore - A normalized score between 0-100, which is based on the probability of the anomalousness of this record
 */
export function getSeverityColor(normalizedScore: number): string {
  if (normalizedScore >= ML_ANOMALY_THRESHOLD.CRITICAL) {
    return ML_SEVERITY_COLORS.CRITICAL;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MAJOR) {
    return ML_SEVERITY_COLORS.MAJOR;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MINOR) {
    return ML_SEVERITY_COLORS.MINOR;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.WARNING) {
    return ML_SEVERITY_COLORS.WARNING;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.LOW) {
    return ML_SEVERITY_COLORS.LOW;
  } else {
    return ML_SEVERITY_COLORS.BLANK;
  }
}
