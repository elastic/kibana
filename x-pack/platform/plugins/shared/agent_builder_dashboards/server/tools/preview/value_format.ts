/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

/** The `format` of a Lens API column. */
export interface ValueFormat {
  type: string;
  decimals?: number;
  compact?: boolean;
  suffix?: string;
  pattern?: string;
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

// The numeral patterns Lens builds for each format (`supportedFormats`); durations fall back to
// plain numbers.
const toNumeralPattern = ({ type, decimals = 2, compact, pattern }: ValueFormat) => {
  const fraction = decimals > 0 ? `.${'0'.repeat(decimals)}` : '';
  const compactSuffix = compact ? 'a' : '';
  switch (type) {
    case 'number':
      return `0,0${fraction}${compactSuffix}`;
    case 'percent':
      return `0,0${fraction}${compactSuffix}%`;
    case 'bytes':
      return `0,0${fraction}b`;
    case 'bits':
      return `0,0${fraction}bitd`;
    case 'custom':
      return pattern;
    default:
      return undefined;
  }
};

/** Returns a number formatter for a Lens API column format, like the one Lens applies. */
export const getValueFormatter = (format: ValueFormat | undefined): ((value: number) => string) => {
  const pattern = format && toNumeralPattern(format);
  const suffix = format?.suffix ?? '';
  return (value: number) =>
    `${pattern ? numeral(value).format(pattern) : numberFormat.format(value)}${suffix}`;
};
