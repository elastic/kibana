/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANOMALY_SEVERITY } from './anomaly_severity';

/**
 * Returns a severity type (indicating a critical, major, minor, warning or low severity anomaly)
 * for the supplied normalized anomaly score (a value between 0 and 100).
 * @param normalizedScore - A normalized score between 0-100, which is based on the probability of the anomalousness of this record
 */
export function getSeverityType(normalizedScore: number): ANOMALY_SEVERITY {
  if (normalizedScore >= 75) {
    return ANOMALY_SEVERITY.CRITICAL;
  } else if (normalizedScore >= 50) {
    return ANOMALY_SEVERITY.MAJOR;
  } else if (normalizedScore >= 25) {
    return ANOMALY_SEVERITY.MINOR;
  } else if (normalizedScore >= 3) {
    return ANOMALY_SEVERITY.WARNING;
  } else if (normalizedScore >= 0) {
    return ANOMALY_SEVERITY.LOW;
  } else {
    return ANOMALY_SEVERITY.UNKNOWN;
  }
}
