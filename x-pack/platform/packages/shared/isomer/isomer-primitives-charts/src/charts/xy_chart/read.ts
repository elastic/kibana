/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue, type ValueFormat } from '../../model/format';
import { timeColumn } from '../../model/time';
import type { ChartReading } from '../../render/surfaces';

import { type ResolvedXy, resolveXy, type XySeries } from './model';
import type { XyChartNode } from './schema';

/** Words the text surfaces print, in one place. */
const copy = {
  xColumn: { category: 'Category', time: 'Time', number: 'Number' },
  noValues: 'No values.',
  peak: (series: string, value: string, at: string) => `${series} is highest at ${at}: ${value}.`,
  above: (count: number, total: number, label: string, value: string, tone: string | undefined) =>
    `${count} of ${total} values are above ${label} (${
      tone === undefined ? value : `${value}, ${tone}`
    }).`,
  range: (series: string, from: string, to: string, low: string, high: string) =>
    `${series} runs from ${from} to ${to}, between ${low} and ${high}.`,
  largestValue: (count: number, value: string, series: string, at: string) =>
    `Across ${count} series, the largest value is ${value}: ${series} at ${at}.`,
  largestTotal: (count: number, value: string, at: string) =>
    `Across ${count} stacked series, the largest total is ${value} at ${at}.`,
  shares: (count: number) => `Each position shows how ${count} series share its total.`,
};

const present = (values: readonly (number | null | undefined)[]) =>
  values.flatMap((value, index) => (typeof value === 'number' ? [{ value, index }] : []));

const extreme = <T extends { value: number }>(items: readonly T[], sign: 1 | -1): T =>
  items.reduce((best, item) => (sign * item.value > sign * best.value ? item : best));

const formatOf = (node: XyChartNode, axis: XySeries['axis']): ValueFormat | undefined =>
  (axis === 'y2' ? node.y2 : node.y)?.format;

/** How many values on its axis sit above each labelled threshold. */
const thresholdClauses = (node: XyChartNode, { series, thresholds }: ResolvedXy): string[] =>
  thresholds.flatMap(({ value, label, tone, axis }) => {
    if (label === undefined) {
      return [];
    }
    const values = series.filter((s) => s.axis === axis).flatMap((s) => present(s.values));
    return values.length === 0
      ? []
      : [
          copy.above(
            values.filter((item) => item.value > value).length,
            values.length,
            label,
            formatValue(value, formatOf(node, axis)),
            tone
          ),
        ];
  });

/** The first sentence: about the left axis when series read against two, since their units differ. */
const lead = (node: XyChartNode): string => {
  const { positions, series: allSeries, stack } = resolveXy(node);
  const series = allSeries.some(({ axis }) => axis === 'y')
    ? allSeries.filter(({ axis }) => axis === 'y')
    : allSeries;
  const all = series.flatMap((s) => present(s.values).map((item) => ({ ...item, series: s })));
  if (all.length === 0) {
    return copy.noValues;
  }
  const stackable = series.filter(({ kind }) => kind !== 'line');
  if (stack === 'percent' && stackable.length > 1) {
    return copy.shares(stackable.length);
  }
  if (
    stack !== 'none' &&
    stackable.length > 1 &&
    stackable.every(({ axis }) => axis === stackable[0]!.axis)
  ) {
    const totals = positions.map((_, index) => ({
      index,
      value: stackable.reduce((sum, { values }) => sum + (values[index] ?? 0), 0),
    }));
    const top = extreme(totals, 1);
    return copy.largestTotal(
      stackable.length,
      formatValue(top.value, formatOf(node, stackable[0]!.axis)),
      positions[top.index]!.label
    );
  }
  if (series.length === 1) {
    const [only] = series;
    const points = present(only!.values);
    const format = formatOf(node, only!.axis);
    if (node.x.type === 'category') {
      const top = extreme(points, 1);
      return copy.peak(only!.label, formatValue(top.value, format), positions[top.index]!.label);
    }
    return copy.range(
      only!.label,
      positions[points[0]!.index]!.label,
      positions[points[points.length - 1]!.index]!.label,
      formatValue(extreme(points, -1).value, format),
      formatValue(extreme(points, 1).value, format)
    );
  }
  const top = extreme(all, 1);
  return copy.largestValue(
    series.length,
    formatValue(top.value, formatOf(node, top.series.axis)),
    top.series.label,
    positions[top.index]!.label
  );
};

/** The x column names the time zone its times print in. */
const xColumn = ({ x }: XyChartNode, { time }: ResolvedXy): string => {
  const column = x.title ?? copy.xColumn[x.type];
  return time === undefined ? column : timeColumn(column, time.timeZone);
};

/** One row per x position in axis order, one column per series; a point the series lacks prints as missing. */
export const read = (node: XyChartNode): ChartReading => {
  const resolved = resolveXy(node);
  const { positions, series } = resolved;
  return {
    summary: [lead(node), ...thresholdClauses(node, resolved)].join(' '),
    table: {
      columns: [xColumn(node, resolved), ...series.map(({ label }) => label)],
      rows: positions.map(({ label }, index) => [
        label,
        ...series.map(({ values, axis }) =>
          formatValue(values[index] ?? null, formatOf(node, axis))
        ),
      ]),
    },
  };
};
