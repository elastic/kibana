/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColorBand } from '@elastic/charts';
import { colorPalette } from '@elastic/eui';

import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';
import { ML_SEVERITY_COLORS } from './severity_colors';

// Severity Color Palette

// Level 14		|  Danger 90		|		#C61E25
// Level 13		|  Danger 80		|		#DA3737
// Level 12		|  Danger 70		|		#EE4C48
// Level 11		|  Danger 60		|		#F6726A
// Level 10		|  Danger 50		|		#FC9188
// Level 9			|  Danger 40		|		#FFB5AD
// Level 8			|  Danger 30		|		#FFC9C2

// Level 7			|  Warning 30		|		#FCD883
// Level 6			|  Warning 20		|		#FDE9B5

// Category 5		|  Blue Grey 30		|		#CAD3E2
// Category 4		|  Blue Grey 45		|		#ABB9D0
// Category 3		|  Blue Grey 60		|		#8E9FBC
// Category 2		|  Blue Grey 75		|		#7186A8
// Category 1		|  Blue Grey 90		|		#5A6D8C

// Category 0		|  Muted Grey 20	|		#E5E9F0

// const colors = [
//   '#C61E25',
//   '#DA3737',
//   '#EE4C48',
//   '#F6726A',
//   '#FC9188',
//   '#FFB5AD',
//   '#FFC9C2',
//   '#CAD3E2',
//   '#ABB9D0',
// ];

// colors.reverse();

const palette = colorPalette(['#E5E9F0', '#C61E25'], 5);
// skip the first value from "palette"
export const mlSeverityPalette = palette;

// ['#FFC9C2', '#FC9188', '#F6726A', '#DA3737'];

const numOfColors = mlSeverityPalette.length;
const min = 0;
const max = 100;
const interval = (max - min) / numOfColors;

export const severityColorBands = Array.from<unknown, ColorBand>(
  { length: numOfColors },
  (d, i) => ({
    color: mlSeverityPalette[i],
    start: Math.floor(min + i * interval),
    end: Math.ceil(min + (i + 1) * interval),
  })
);

/**
 * Returns a severity RGB color (one of critical, major, minor, warning, low or unknown)
 * for the supplied normalized anomaly score (a value between 0 and 100).
 * @param normalizedScore - A normalized score between 0-100, which is based on the probability of the anomalousness of this record
 */
export function getSeverityColor(normalizedScore: number): string {
  // map normalizedScore (0-100) to array items of colors array
  const colorIndex = Math.floor((normalizedScore / 100) * mlSeverityPalette.length);
  const color = mlSeverityPalette[colorIndex];

  if (color) {
    return color;
  }

  return ML_SEVERITY_COLORS.BLANK;

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
