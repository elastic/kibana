/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** `null` means no data. It never shows as a number. */
export const STATS_NO_VALUE_LABEL = '-';

const MIN_VISIBLE_RATE = 0.01;
const COMPACT_RATE_THRESHOLD = 1000;
const SECONDS_PER_MILLISECOND = 0.001;
const MICROSECONDS_PER_SECOND = 1_000_000;
const MILLISECONDS_PER_SECOND = 1000;

// `formatNumber` floors when it gets a format string. Only `round: true` rounds.
const formatRounded = (value: number, format: string): string =>
  formatNumber(value, { format, round: true });

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// The tier is chosen from the value rounded to that tier's precision, so a value that rounds up
// across a threshold, such as 9.96, takes the format of the next tier and shows `10`, not `10.0`.
const formatRateValue = (value: number): string => {
  if (value === 0) return '0';
  if (value < MIN_VISIBLE_RATE) return `<${MIN_VISIBLE_RATE}`;
  if (roundTo(value, 2) < 1) return formatRounded(value, '0.00');
  if (roundTo(value, 1) < 10) return formatRounded(value, '0.0');
  if (Math.round(value) < COMPACT_RATE_THRESHOLD) return formatRounded(value, '0');
  // A value that rounds up to 1000 is clamped, because the compact format leaves 999.6 as it is.
  return formatRounded(Math.max(value, COMPACT_RATE_THRESHOLD), '0.[0]a');
};

/** Events per second, for example `3.7k eps`. */
export const formatEventsRate = (eventsPerSecond: number | null): string =>
  eventsPerSecond === null
    ? STATS_NO_VALUE_LABEL
    : i18n.translate('xpack.streams.stats.eventsRate', {
        defaultMessage: '{value} eps',
        values: { value: formatRateValue(eventsPerSecond) },
      });

const formatDurationValue = (value: number): string =>
  formatRounded(value, value < 10 ? '0.[0]' : '0');

/** A duration in seconds, shown as µs, ms or s to keep the precision, for example `8ms`. */
export const formatDuration = (seconds: number | null): string => {
  if (seconds === null) return STATS_NO_VALUE_LABEL;

  if (seconds < SECONDS_PER_MILLISECOND) {
    return i18n.translate('xpack.streams.stats.durationMicroseconds', {
      defaultMessage: '{value}µs',
      values: { value: formatDurationValue(seconds * MICROSECONDS_PER_SECOND) },
    });
  }

  if (seconds < 1) {
    return i18n.translate('xpack.streams.stats.durationMilliseconds', {
      defaultMessage: '{value}ms',
      values: { value: formatDurationValue(seconds * MILLISECONDS_PER_SECOND) },
    });
  }

  return i18n.translate('xpack.streams.stats.durationSeconds', {
    defaultMessage: '{value}s',
    values: { value: formatDurationValue(seconds) },
  });
};
