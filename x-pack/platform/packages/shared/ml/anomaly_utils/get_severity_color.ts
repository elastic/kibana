/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';
import { ML_SEVERITY_COLORS } from './severity_colors';

/**
 * @deprecated Prefer using the `useSeverityColor` hook for functional components
 * or ensure `EuiTheme` is passed to `getThemeResolvedSeverityColor` for class components
 * to get theme-aware colors. This function uses a fixed set of legacy colors.
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
    return ML_SEVERITY_COLORS.UNKNOWN;
  }
}
