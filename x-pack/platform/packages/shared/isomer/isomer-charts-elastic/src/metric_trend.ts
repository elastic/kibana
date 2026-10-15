/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h, type ReactNode } from 'react';
import { Chart, Metric, type MetricDatum, MetricTrendShape, Settings } from '@elastic/charts';
import {
  type LiveChartProps,
  type MetricTrendNode,
  resolveMetricTrend,
} from '@kbn/isomer-primitives-charts';

import type { ChartHint } from './hints';
import { kibanaBaseTheme } from './theme';

/** One value as Lens's metric draws it: the value, the change as its secondary metric, and the trend behind. */
export const MetricTrendChart = ({
  node,
  theme,
  width,
  height,
  onSelect,
  hint = {},
}: LiveChartProps<MetricTrendNode> & { hint?: ChartHint }): ReactNode => {
  const { formatted, previous, change, trend, tone, band } = resolveMetricTrend(node);
  const color =
    (band === undefined ? undefined : hint.colors?.[`band:${band.index}`]) ??
    hint.colors?.value ??
    (tone === undefined ? theme.surface : theme.tone[tone]);
  const extra =
    previous === undefined
      ? undefined
      : {
          value:
            change === undefined ? previous.formatted : `${change.text} from ${previous.label}`,
        };
  const points = trend.flatMap(({ time, value }) =>
    value === null ? [] : [{ x: time, y: value }]
  );
  const datum: MetricDatum = {
    title: node.title,
    value: formatted,
    color,
    ...(extra === undefined ? {} : { extra }),
    ...(points.length > 1 ? { trend: points, trendShape: MetricTrendShape.Area } : {}),
  };
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
      ...(onSelect ? { onElementClick: () => onSelect([{}]) } : {}),
    }),
    h(Metric, { id: node.title, data: [[datum]] })
  );
};
