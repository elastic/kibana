/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h, type ReactNode } from 'react';
import { Chart, type Datum, Partition, PartitionLayout, Settings } from '@elastic/charts';
import {
  type DonutNode,
  formatValue,
  type LiveChartProps,
  resolveDonut,
} from '@kbn/isomer-primitives-charts';

import type { ChartHint } from './hints';
import { kibanaBaseTheme } from './theme';

/** Lens's default for a share printed on a slice. */
const LENS_PERCENT_DECIMALS = 2;

/** Lens's medium donut hole. */
const EMPTY_SIZE_RATIO = 0.54;

/** A flat part-to-whole as Lens's pie draws it: a sunburst with a hole, one ring of slices. */
export const DonutChart = ({
  node,
  theme,
  width,
  height,
  onSelect,
  hint = {},
}: LiveChartProps<DonutNode> & { hint?: ChartHint }): ReactNode => {
  const { parts } = resolveDonut(node);
  const index = new Map(parts.map(({ key }, at) => [key, at]));
  const label = new Map(parts.map(({ key, label: printed }) => [key, printed]));
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
      theme: {
        background: { color: 'transparent' },
        partition: { emptySizeRatio: hint.pie ? 0 : EMPTY_SIZE_RATIO },
      },
      showLegend: hint.legend?.show ?? true,
      ...(onSelect
        ? {
            onElementClick: (elements: readonly unknown[]) => {
              const [first] = elements as [[readonly { groupByRollup?: unknown }[]]];
              const key = first?.[0]?.[0]?.groupByRollup;
              if (typeof key === 'string') {
                onSelect([{ slice: key }]);
              }
            },
          }
        : {}),
    }),
    h(Partition, {
      id: node.title ?? 'donut',
      data: [...parts],
      layout: PartitionLayout.sunburst,
      valueAccessor: (datum: Datum) => (datum as (typeof parts)[number]).value,
      ...(hint.values === 'percent' ? { valueGetter: 'percent' as const } : {}),
      valueFormatter: (value: number) =>
        hint.values === 'hidden' ? '' : formatValue(value, node.format),
      percentFormatter: (share: number) =>
        hint.values === 'hidden'
          ? ''
          : formatValue(share / 100, {
              style: 'percent',
              precision: hint.percentDecimals ?? LENS_PERCENT_DECIMALS,
            }),
      layers: [
        {
          // Keys, not labels, so parts that share a label stay apart.
          groupByRollup: (datum: Datum) => (datum as (typeof parts)[number]).key,
          nodeLabel: (key: unknown) => label.get(String(key)) ?? String(key),
          shape: {
            fillColor: (key: unknown) =>
              hint.colors?.[String(key)] ??
              theme.series[(index.get(String(key)) ?? 0) % theme.series.length]!,
          },
        },
      ],
    })
  );
};
