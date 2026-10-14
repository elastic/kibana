/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from '../../model/format';
import { timeColumn } from '../../model/time';
import type { Tone } from '../../model/tone';
import type { ChartReading } from '../../render/surfaces';

import { copy as changeCopy, resolveMetricTrend } from './model';
import type { MetricTrendNode } from './schema';

/** Words the text surfaces print beyond the change itself, which {@link changeCopy} words for every surface. */
const copy = {
  readingColumn: 'Reading',
  current: 'Current',
  status: 'Status',
  statusCell: (tone: Tone) => `${tone[0]!.toUpperCase()}${tone.slice(1)}`,
  withStatus: (tone: Tone) => `with ${tone} status`,
  change: 'Change',
  is: (title: string, value: string) => `${title} is ${value}`,
  noReading: (title: string) => `${title} has no current reading`,
  previousWas: (label: string, value: string) => `The value from ${label} is ${value}.`,
  range: (from: string, to: string, low: string, high: string) =>
    `From ${from} to ${to} it ranged between ${low} and ${high}.`,
};

/** The trend's time span and value range, or nothing when it holds no values. */
const rangeClause = (
  node: MetricTrendNode,
  trend: ReturnType<typeof resolveMetricTrend>['trend']
): string[] => {
  const present = trend.filter(
    (point): point is typeof point & { value: number } => point.value !== null
  );
  if (present.length === 0) {
    return [];
  }
  const values = present.map(({ value }) => value);
  return [
    copy.range(
      present[0]!.label,
      present[present.length - 1]!.label,
      formatValue(Math.min(...values), node.format),
      formatValue(Math.max(...values), node.format)
    ),
  ];
};

const summaryOf = (node: MetricTrendNode): string => {
  const { title } = node;
  const { value, formatted, previous, change, trend, tone } = resolveMetricTrend(node);
  const status = tone === undefined ? '' : ` ${copy.withStatus(tone)}`;
  if (value === null) {
    return [
      `${copy.noReading(title)}${tone === undefined ? '' : `,${status}`}.`,
      ...(previous === undefined
        ? rangeClause(node, trend)
        : [copy.previousWas(previous.label, previous.formatted)]),
    ].join(' ');
  }
  const head = `${copy.is(title, formatted)}${status}`;
  if (previous !== undefined && change !== undefined) {
    return `${head}, ${changeCopy.from(change.text, previous.label)}.`;
  }
  return [`${head}.`, ...rangeClause(node, trend)].join(' ');
};

/** The current value, its status, the previous value and change when given, then the trend by time. */
export const read = (node: MetricTrendNode): ChartReading => {
  const { formatted, previous, change, trend, time, tone } = resolveMetricTrend(node);
  return {
    summary: summaryOf(node),
    table: {
      columns: [
        time === undefined ? copy.readingColumn : timeColumn(copy.readingColumn, time.timeZone),
        node.title,
      ],
      rows: [
        [copy.current, formatted],
        ...(tone === undefined ? [] : [[copy.status, copy.statusCell(tone)]]),
        ...(previous === undefined ? [] : [[previous.label, previous.formatted]]),
        ...(change === undefined ? [] : [[copy.change, change.detail]]),
        ...trend.map(({ label, formatted: cell }) => [label, cell]),
      ],
    },
  };
};
