/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement as h, type ReactNode } from 'react';
import { Chart, type Datum, Partition, PartitionLayout, Settings } from '@elastic/charts';
import {
  formatValue,
  type LiveChartProps,
  resolveTreemap,
  type TreemapNode,
} from '@kbn/isomer-primitives-charts';

import type { ChartHint } from './hints';
import { lightenColor } from './lighten';
import { kibanaBaseTheme } from './theme';

/** Lens's default for a share printed on a tile. */
const LENS_PERCENT_DECIMALS = 2;

interface Leaf {
  /** Keys from the top-level item down; shorter than the deepest leaf's where the tree is uneven. */
  path: readonly string[];
  value: number;
}

/** A hierarchy as Lens's treemap draws it: one layer per depth, each top-level item in its own color. */
export const TreemapChart = ({
  node,
  theme,
  width,
  height,
  onSelect,
  hint = {},
}: LiveChartProps<TreemapNode> & { hint?: ChartHint }): ReactNode => {
  const { parts, roots, layout } = resolveTreemap(node);
  const leaves: Leaf[] = parts.flatMap(({ keyPath, value, children }) =>
    children.length === 0 ? [{ path: keyPath, value }] : []
  );
  const depth = Math.max(...leaves.map(({ path }) => path.length));
  const byKey = new Map(parts.map((part) => [part.key, part]));
  const rootColor = new Map(
    roots.map((index, at) => {
      const { key } = parts[index]!;
      return [key, hint.colors?.[key] ?? theme.series[at % theme.series.length]!];
    })
  );
  const colorOf = (key: unknown): string => {
    const part = byKey.get(String(key));
    const own = hint.colors?.[String(key)];
    if (own !== undefined || part === undefined) {
      return own ?? theme.series[0]!;
    }
    const root = rootColor.get(part.keyPath[0]!) ?? theme.series[0]!;
    return lightenColor(root, part.depth + 1, depth);
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
      theme: { background: { color: 'transparent' } },
      showLegend: hint.legend?.show ?? false,
      ...(onSelect
        ? {
            onElementClick: (elements: readonly unknown[]) => {
              const [first] = elements as [[readonly { groupByRollup?: unknown }[]]];
              const path = (first?.[0] ?? []).flatMap(({ groupByRollup }) =>
                typeof groupByRollup === 'string' ? [groupByRollup] : []
              );
              if (path.length > 0) {
                onSelect([{ path }]);
              }
            },
          }
        : {}),
    }),
    h(Partition, {
      id: node.title ?? 'treemap',
      data: leaves,
      layout: layout === 'rings' ? PartitionLayout.sunburst : PartitionLayout.treemap,
      valueAccessor: (datum: Datum) => (datum as Leaf).value,
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
      layers: Array.from({ length: depth }, (_, level) => ({
        groupByRollup: (datum: Datum) => (datum as Leaf).path[level] ?? null,
        showAccessor: (key: unknown) => key !== null,
        nodeLabel: (key: unknown) => byKey.get(String(key))?.printedPath.at(-1) ?? String(key),
        shape: { fillColor: colorOf },
      })),
    })
  );
};
