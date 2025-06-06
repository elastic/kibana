/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';

export interface ColorRampStop {
  stop: number;
  color: string;
  [key: string]: any;
}

/**
 * Returns a theme-aware color ramp for ML severity scores.
 * @param euiTheme The EUI theme object.
 * @returns An array of ColorRampStop objects.
 */
export const getMlSeverityColorRampValue = (euiTheme: EuiThemeComputed): ColorRampStop[] => [
  {
    stop: ML_ANOMALY_THRESHOLD.LOW,
    color: euiTheme.colors.severity.neutral,
  },
  {
    stop: ML_ANOMALY_THRESHOLD.MINOR,
    color: euiTheme.colors.severity.warning,
  },
  {
    stop: ML_ANOMALY_THRESHOLD.MAJOR,
    color: euiTheme.colors.severity.risk,
  },
  {
    stop: ML_ANOMALY_THRESHOLD.CRITICAL,
    color: euiTheme.colors.severity.danger,
  },
];
