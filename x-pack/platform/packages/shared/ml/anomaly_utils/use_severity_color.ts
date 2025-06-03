/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';

// Define the return type for all severity colors
export interface SeverityColors {
  CRITICAL: string;
  MAJOR: string;
  MINOR: string;
  WARNING: string;
  LOW: string;
  UNKNOWN: string;
}

/**
 * React hook that returns severity colors for anomaly scores.
 * @param normalizedScore - A normalized score between 0-100, which is based on the probability of the anomalousness of this record
 */
export function useSeverityColor(normalizedScore: number): string {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    // Define all severity colors
    const allColors: SeverityColors = {
      CRITICAL: euiTheme.colors.severity.danger,
      MAJOR: euiTheme.colors.severity.risk,
      MINOR: euiTheme.colors.severity.warning,
      WARNING: '#94D8EB', // TODO SKY/40
      LOW: '#CFEEF7', // TODO SKY/20
      UNKNOWN: euiTheme.colors.severity.unknown,
    };

    // Otherwise, return the specific color based on the score
    if (normalizedScore >= ML_ANOMALY_THRESHOLD.CRITICAL) {
      return allColors.CRITICAL;
    } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MAJOR) {
      return allColors.MAJOR;
    } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MINOR) {
      return allColors.MINOR;
    } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.WARNING) {
      return allColors.WARNING;
    } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.LOW) {
      return allColors.LOW;
    } else {
      return allColors.UNKNOWN;
    }
  }, [
    euiTheme.colors.severity.danger,
    euiTheme.colors.severity.risk,
    euiTheme.colors.severity.unknown,
    euiTheme.colors.severity.warning,
    normalizedScore,
  ]);
}
