/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h, type ReactNode } from 'react';
import { Chart, type ColorBand, Heatmap, Predicate, ScaleType, Settings } from '@elastic/charts';
import {
  formatTime,
  formatValue,
  type HeatmapNode,
  type LiveChartProps,
  type ResolvedChartTheme,
  resolveHeatmap,
  timeValue,
} from '@kbn/isomer-primitives-charts';

import type { ChartHint } from './hints';
import { type BaseTheme, kibanaBaseTheme } from './theme';

type ColorScale = ReturnType<typeof resolveHeatmap>['colorScale'];

/** `count` equal bands from `low` to `high`, colored in order. */
const evenBands = (low: number, high: number, colors: readonly string[]): ColorBand[] => {
  const width = (high - low) / colors.length;
  return colors.map((color, index) => ({
    start: low + index * width,
    end: index === colors.length - 1 ? high : low + (index + 1) * width,
    color,
  }));
};

/** The scale as Elastic Charts' heatmap takes it: bands, a continuous scale stepped along the theme's ramp, each overridable by a `band:<index>` hint. */
const colorBands = (scale: ColorScale, theme: ResolvedChartTheme, hint: ChartHint): ColorBand[] => {
  const banded = (() => {
    if (scale.type === 'bands') {
      const { sequential } = theme;
      return scale.bands.map(({ from, to, tone, label, step }) => ({
        start: from ?? -Infinity,
        end: to ?? Infinity,
        color:
          tone === undefined
            ? sequential[Math.round(step * (sequential.length - 1))]!
            : theme.tone[tone],
        label,
      }));
    }
    if (scale.min === scale.max) {
      return [{ start: scale.min, end: scale.max, color: theme.sequential.at(-1)! }];
    }
    if (scale.type === 'sequential') {
      return evenBands(scale.min, scale.max, theme.sequential);
    }
    const { diverging } = theme;
    const lower = Math.ceil(diverging.length / 2);
    return [
      ...evenBands(scale.min, scale.midpoint, diverging.slice(0, lower)),
      ...evenBands(scale.midpoint, scale.max, diverging.slice(lower)),
    ];
  })();
  // Values past either end take its color.
  return banded.map((band, index) => ({
    ...band,
    ...(index === 0 ? { start: -Infinity } : {}),
    ...(index === banded.length - 1 ? { end: Infinity } : {}),
    ...(hint.colors?.[`band:${index}`] === undefined
      ? {}
      : { color: hint.colors[`band:${index}`]! }),
  }));
};

interface Cell {
  x: string | number;
  y: string;
  value: number;
}

/** A grid of values as Lens's heatmap draws it, with its color scale as bands. */
export const HeatmapChart = ({
  node,
  theme,
  width,
  height,
  onSelect,
  hint = {},
  baseTheme = kibanaBaseTheme,
}: LiveChartProps<HeatmapNode> & {
  hint?: ChartHint;
  baseTheme?: BaseTheme;
}): ReactNode => {
  const { x, y, time, values, colorScale } = resolveHeatmap(node);
  const isTime = node.x.type === 'time';
  const xOf = (key: string): string | number => (isTime ? timeValue(key) : key);
  const rows = y ?? [{ key: '', label: '' }];
  const cells: Cell[] = rows.flatMap(({ key: row }, rowIndex) =>
    x.flatMap(({ key: column }, columnIndex) => {
      const value = values[rowIndex]![columnIndex];
      return typeof value === 'number' ? [{ x: xOf(column), y: row, value }] : [];
    })
  );
  const xKey = new Map(x.map(({ key }) => [String(xOf(key)), key]));
  const xLabel = new Map(x.map(({ key, label }) => [String(xOf(key)), label]));
  const yLabel = new Map(rows.map(({ key, label }) => [key, label]));
  const starts = x.map(({ key }) => Number(xOf(key)));
  const step =
    time?.interval ?? Math.min(...starts.slice(1).map((start, index) => start - starts[index]!));
  const window = time?.window;
  return h(
    Chart,
    {
      size:
        width === undefined || height === undefined
          ? { width: '100%', height: '100%' }
          : { width, height },
    },
    h(Settings, {
      baseTheme: baseTheme(theme.mode),
      theme: {
        background: { color: 'transparent' },
        ...(hint.valueLabels === undefined
          ? {}
          : { heatmap: { cell: { label: { visible: hint.valueLabels } } } }),
      },
      showLegend: hint.legend?.show ?? true,
      ...(window === undefined
        ? {}
        : {
            // The heatmap stops a bucket short of `max`, so the bucket holding `to` needs one more.
            xDomain: { min: window.from, max: window.to + step },
          }),
      ...(onSelect
        ? {
            onElementClick: (elements: readonly unknown[]) => {
              const [first] = elements as [[{ datum?: Cell }]];
              const datum = first?.[0]?.datum;
              if (datum !== undefined) {
                onSelect([
                  {
                    x: xKey.get(String(datum.x)) ?? String(datum.x),
                    ...(y === undefined ? {} : { y: datum.y }),
                  },
                ]);
              }
            },
          }
        : {}),
    }),
    h(Heatmap, {
      id: node.title ?? 'heatmap',
      data: cells,
      xAccessor: 'x',
      yAccessor: 'y',
      valueAccessor: 'value',
      xSortPredicate: isTime ? Predicate.NumAsc : Predicate.DataIndex,
      ySortPredicate: Predicate.DataIndex,
      xScale:
        isTime && Number.isFinite(step)
          ? {
              type: ScaleType.Time,
              interval: { type: 'fixed', unit: 'ms', value: step },
            }
          : { type: ScaleType.Ordinal },
      ...(time === undefined ? {} : { timeZone: time.timeZone }),
      colorScale: {
        type: 'bands',
        bands: colorBands(colorScale, theme, hint),
        labelFormatter: (start: number, end: number) => {
          const print = (value: number) => formatValue(value, node.format);
          return start === -Infinity
            ? `< ${print(end)}`
            : end === Infinity
            ? `≥ ${print(start)}`
            : `${print(start)} – ${print(end)}`;
        },
      },
      valueFormatter: (value: number) => formatValue(value, node.format),
      xAxisTitle: node.x.title ?? '',
      yAxisTitle: node.y?.title ?? '',
      xAxisLabelFormatter: (value: string | number) =>
        isTime && time !== undefined && !xLabel.has(String(value))
          ? formatTime(new Date(Number(value)).toISOString(), time)
          : xLabel.get(String(value)) ?? String(value),
      yAxisLabelFormatter: (value: string | number) => yLabel.get(String(value)) ?? String(value),
    })
  );
};
