/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';
import type { MlSeverityType } from './anomaly_severity';
import { ML_ANOMALY_SEVERITY_TYPES } from './anomaly_severity_types';

/**
 * Returns a severity label (one of critical, major, minor, warning or unknown)
 * for the supplied normalized anomaly score (a value between 0 and 100).
 * @param normalizedScore - A normalized score between 0-100, which is based on the probability of the anomalousness of this record
 */
export function getSeverity(normalizedScore: number): MlSeverityType {
  if (normalizedScore >= ML_ANOMALY_THRESHOLD.CRITICAL) {
    return ML_ANOMALY_SEVERITY_TYPES.critical;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MAJOR) {
    return ML_ANOMALY_SEVERITY_TYPES.major;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MINOR) {
    return ML_ANOMALY_SEVERITY_TYPES.minor;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.LOW) {
    return ML_ANOMALY_SEVERITY_TYPES.warning;
  } else {
    return ML_ANOMALY_SEVERITY_TYPES.unknown;
  }
}
