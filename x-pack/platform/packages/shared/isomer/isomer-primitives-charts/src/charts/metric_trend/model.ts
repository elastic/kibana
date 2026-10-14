/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue, type ValueFormat } from '../../model/format';
import {
  DEFAULT_TIME_ZONE,
  defaultGranularity,
  formatTime,
  type Granularity,
  timeValue,
} from '../../model/time';
import type { Tone } from '../../model/tone';
import { glyph } from '../../theme/glyph';

import type { MetricTrendNode } from './schema';

/** Words every surface prints, in one place. */
export const copy = {
  direction: { up: 'up', down: 'down' },
  unchanged: 'unchanged',
  points: (amount: string) =>
    `${amount}${glyph.unitGap}${amount === '1' ? 'percentage point' : 'percentage points'}`,
  /** `up 512 (12%)`, or without a relative change `up 512`. */
  change: (direction: string, absolute: string, relative?: string) =>
    relative === undefined ? `${direction} ${absolute}` : `${direction} ${absolute} (${relative})`,
  from: (change: string, label: string) => `${change} from ${label}`,
};

/** The relative change prints only below this multiple of the previous value. */
export const MAX_RELATIVE_CHANGE = 1000;

export type MetricDirection = 'up' | 'down' | 'unchanged';

export interface MetricChange {
  /** `unchanged` whenever the change prints as zero in the value's format. */
  direction: MetricDirection;
  /** `value - previous.value`. */
  absolute: number;
  /** `absolute / |previous.value|`; absent when the previous value is 0 or the ratio reaches {@link MAX_RELATIVE_CHANGE}. */
  relative?: number;
  /** The headline wording, e.g. `up 12%`: the relative change, else the absolute; always the absolute for a `percent` value. */
  text: string;
  /** Both magnitudes, e.g. `up 512 (12%)`. */
  detail: string;
}

export interface MetricTrendPoint {
  /** The point `x` as authored. */
  key: string;
  /** Milliseconds since the epoch. */
  time: number;
  /** As every surface prints it. */
  label: string;
  value: number | null;
  formatted: string;
}

/** A metricTrend with its change derived and its trend ordered by time, for every surface. */
export interface ResolvedMetricTrend {
  value: number | null;
  formatted: string;
  previous?: { value: number; formatted: string; label: string };
  /** Absent without a previous reading or a current value. */
  change?: MetricChange;
  trend: readonly MetricTrendPoint[];
  /** Present with a trend: where its times are read and how finely they print. */
  time?: { timeZone: string; granularity: Granularity };
  /** The author's status; absent when none was given. */
  tone?: Tone;
}

/** A change's magnitude as it prints: percentage points for a `percent` value. */
const magnitude = (amount: number, format: ValueFormat | undefined): string => {
  if (format?.style !== 'percent') {
    return formatValue(amount, format);
  }
  const { precision } = format;
  return copy.points(
    formatValue(amount * 100, {
      style: 'number',
      ...(precision === undefined ? {} : { precision }),
    })
  );
};

const changeOf = (
  value: number,
  previous: number,
  format: ValueFormat | undefined
): MetricChange => {
  const absolute = value - previous;
  const printed = magnitude(Math.abs(absolute), format);
  const ratio = previous === 0 ? undefined : absolute / Math.abs(previous);
  const relative = ratio !== undefined && Math.abs(ratio) < MAX_RELATIVE_CHANGE ? ratio : undefined;
  const base = { absolute, ...(relative === undefined ? {} : { relative }) };
  if (printed === magnitude(0, format)) {
    return {
      ...base,
      direction: 'unchanged',
      text: copy.unchanged,
      detail: copy.unchanged,
    };
  }
  const direction = absolute > 0 ? 'up' : 'down';
  const word = copy.direction[direction];
  const percent =
    relative === undefined ? undefined : formatValue(Math.abs(relative), { style: 'percent' });
  const headline =
    percent === undefined ||
    format?.style === 'percent' ||
    percent === formatValue(0, { style: 'percent' })
      ? printed
      : percent;
  return {
    ...base,
    direction,
    text: copy.change(word, headline),
    detail: copy.change(word, printed, percent),
  };
};

export const resolveMetricTrend = (node: MetricTrendNode): ResolvedMetricTrend => {
  const { value, format, previous, trend, tone } = node;
  const time =
    trend === undefined
      ? undefined
      : {
          timeZone: trend.timeZone ?? DEFAULT_TIME_ZONE,
          granularity: trend.granularity ?? defaultGranularity(trend.points.map(({ x }) => x)),
        };
  return {
    value,
    formatted: formatValue(value, format),
    ...(previous === undefined
      ? {}
      : {
          previous: {
            ...previous,
            formatted: formatValue(previous.value, format),
          },
        }),
    ...(previous === undefined || value === null
      ? {}
      : { change: changeOf(value, previous.value, format) }),
    trend:
      time === undefined
        ? []
        : (trend?.points ?? [])
            .map(({ x, y }) => ({
              key: x,
              time: timeValue(x),
              label: formatTime(x, time),
              value: y,
              formatted: formatValue(y, format),
            }))
            .sort((a, b) => a.time - b.time),
    ...(time === undefined ? {} : { time }),
    ...(tone === undefined ? {} : { tone }),
  };
};
