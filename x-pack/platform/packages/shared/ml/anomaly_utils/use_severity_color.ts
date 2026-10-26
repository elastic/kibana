/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme, euiPaletteSkyBlue, euiPaletteOrange, euiPaletteYellow } from '@elastic/eui';
import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';

/**
 * Resolves severity color based on normalized score and EUI theme colors.
 * This function can be used in contexts where the EuiTheme object is available,
 * for example, within class components that receive the theme via props or context.
 *
 * @param normalizedScore The anomaly score, normalized (typically 0-100).
 * @param euiTheme The EuiTheme object.
 * @returns The hex color string for the severity.
 */
export function getThemeResolvedSeverityColor(
  normalizedScore: number,
  euiTheme: EuiThemeComputed
): string {
  const skyBluePalette = euiPaletteSkyBlue(6);

  if (normalizedScore >= ML_ANOMALY_THRESHOLD.CRITICAL) {
    return euiTheme.colors.severity.danger;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MAJOR) {
    return euiTheme.colors.severity.risk;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MINOR) {
    return euiTheme.colors.severity.warning;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.WARNING) {
    return skyBluePalette[2];
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.LOW) {
    return skyBluePalette[0];
  } else {
    return euiTheme.colors.severity.unknown;
  }
}

export function getThemeResolvedSeverityStrokeColor(
  normalizedScore: number,
  euiTheme: EuiThemeComputed
): string {
  const orangePalette = euiPaletteOrange(6);
  const yellowPalette = euiPaletteYellow(6);
  const skyBluePalette = euiPaletteSkyBlue(6);

  if (normalizedScore >= ML_ANOMALY_THRESHOLD.CRITICAL) {
    return euiTheme.colors.danger;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MAJOR) {
    return orangePalette[5];
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MINOR) {
    return yellowPalette[5];
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.WARNING) {
    return skyBluePalette[3];
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.LOW) {
    return skyBluePalette[0];
  } else {
    return euiTheme.colors.severity.unknown;
  }
}

/**
 * A React hook to get a theme-aware severity color string directly.
 * This hook computes the color based on the normalized score and the current EUI theme.
 *
 * @param normalizedScore The anomaly score, normalized (typically 0-100).
 * @returns The hex color string for the severity, corresponding to the current theme.
 */
export const useSeverityColor = (normalizedScore: number): string => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    return getThemeResolvedSeverityColor(normalizedScore, euiTheme);
  }, [normalizedScore, euiTheme]);
};
