/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { SerializableRecord } from '@kbn/utility-types';
import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';
import { getThemeResolvedSeverityColor } from './use_severity_color';

export interface ColorRampStop extends SerializableRecord {
  stop: number;
  color: string;
}

/**
 * Returns a theme-aware color ramp for ML severity scores.
 * @param euiTheme The EUI theme object.
 * @returns An array of ColorRampStop objects.
 */
export const getMlSeverityColorRampValue = (euiTheme: EuiThemeComputed): ColorRampStop[] => [
  {
    stop: ML_ANOMALY_THRESHOLD.LOW,
    color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.LOW, euiTheme),
  },
  {
    stop: ML_ANOMALY_THRESHOLD.MINOR,
    color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MINOR, euiTheme),
  },
  {
    stop: ML_ANOMALY_THRESHOLD.MAJOR,
    color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MAJOR, euiTheme),
  },
  {
    stop: ML_ANOMALY_THRESHOLD.CRITICAL,
    color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.CRITICAL, euiTheme),
  },
];
