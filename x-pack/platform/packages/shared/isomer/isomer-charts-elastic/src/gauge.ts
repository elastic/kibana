/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h, type ReactNode } from 'react';
import {
  Bullet,
  BulletSubtype,
  Chart,
  Goal,
  LayoutDirection,
  Metric,
  Settings,
} from '@elastic/charts';
import {
  formatValue,
  type GaugeNode,
  type LiveChartProps,
  resolveGauge,
} from '@kbn/isomer-primitives-charts';

import type { ChartHint } from './hints';
import { kibanaBaseTheme } from './theme';

/** Lens's arc gauge sweeps from lower left to lower right. */
const ARC = { start: Math.PI + Math.PI / 4, end: -Math.PI / 4 };

/** One value against a range as Lens draws it: its gauge (Goal) as an arc, its bullet as a bar. */
export const GaugeChart = ({
  node,
  theme,
  width,
  height,
  onSelect,
  hint = {},
}: LiveChartProps<GaugeNode> & { hint?: ChartHint }): ReactNode => {
  const { shape, min, max, value, target, bands } = resolveGauge(node);
  const format = (amount: number) => formatValue(amount, node.format);
  const bandOf = (amount: number) => bands.find(({ from, to }) => amount >= from && amount <= to);
  const valueBand = value === null ? -1 : bands.indexOf(bandOf(value)!);
  const metricColor =
    hint.colors?.[`band:${valueBand}`] ??
    (valueBand === -1 ? theme.surface : theme.tone[bands[valueBand]!.tone]);
  return h(
    Chart,
    {
      size:
        width === undefined || height === undefined
          ? { width: '100%', height: '100%' }
          : { width, height },
    },
    h(Settings, {
      baseTheme: kibanaBaseTheme(theme.mode),
      theme: { background: { color: 'transparent' } },
      ...(onSelect ? { onElementClick: () => onSelect([{}]) } : {}),
    }),
    hint.progress !== undefined
      ? h(Metric, {
          id: node.title,
          data: [
            [
              {
                title: node.title,
                value: value ?? Number.NaN,
                valueFormatter: format,
                color: metricColor,
                progressBarDirection:
                  hint.progress === 'vertical'
                    ? LayoutDirection.Vertical
                    : LayoutDirection.Horizontal,
                domainMax: max,
                ...(min === 0 ? {} : { domainMin: min }),
                ...(target === undefined ? {} : { target }),
              },
            ],
          ],
        })
      : shape === 'bar'
      ? h(Bullet, {
          id: node.title,
          subtype: BulletSubtype.horizontal,
          data: [
            [
              {
                title: node.title,
                value: value ?? min,
                ...(target === undefined ? {} : { target }),
                domain: [min, max],
                valueFormatter: format,
                tickFormatter: format,
              },
            ],
          ],
          ...(bands.length === 0
            ? {}
            : {
                colorBands: {
                  steps: [min, ...bands.map(({ to }) => to)],
                  colors: bands.map(({ tone }) => theme.tone[tone]),
                },
              }),
        })
      : h(Goal, {
          id: node.title,
          // 73.3.0 does not export `GoalSubtype`; this is its `Goal` value.
          subtype: 'goal',
          base: min,
          actual: value ?? min,
          ...(target === undefined ? {} : { target }),
          domain: { min, max },
          ...(bands.length === 0 ? {} : { bands: [min, ...bands.map(({ to }) => to)] }),
          bandFillColor: ({ value: amount }) => {
            const band = bandOf(amount);
            return band === undefined ? theme.gridline : theme.tone[band.tone];
          },
          tickValueFormatter: ({ value: amount }) => format(amount),
          labelMajor: node.title,
          labelMinor: '',
          centralMajor: value === null ? formatValue(null, node.format) : format(value),
          centralMinor: '',
          angleStart: ARC.start,
          angleEnd: ARC.end,
        })
  );
};
