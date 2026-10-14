/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from '../../model/format';
import { keyOf, printedLabels } from '../../model/identity';
import {
  DEFAULT_TIME_ZONE,
  defaultGranularity,
  formatTime,
  type Granularity,
  timeValue,
} from '../../model/time';
import type { Tone } from '../../model/tone';

import type { XyChartNode } from './schema';

export interface XyPosition {
  /** The point `x` as authored: the selection key on `x`. */
  key: string;
  /** As every surface prints it. */
  label: string;
}

export interface XySeries {
  key: string;
  /** As every surface and legend prints it: followed by the key where another series shares the label. */
  label: string;
  kind: 'line' | 'area' | 'bar';
  axis: 'y' | 'y2';
  /** One per {@link ResolvedXy.positions} entry: a number, `null` for a measured gap, `undefined` where the series has no point. */
  values: readonly (number | null | undefined)[];
}

/** An xyChart with its defaults applied and every series aligned to one ordered x domain, for every surface. */
export interface ResolvedXy {
  positions: readonly XyPosition[];
  series: readonly XySeries[];
  stack: 'none' | 'stacked' | 'percent' | 'silhouette';
  missing: 'gap' | 'zero' | 'carry' | 'linear';
  orientation: 'vertical' | 'horizontal';
  /** Present for a `time` x: where its times are read and how finely they print. */
  time?: { timeZone: string; granularity: Granularity };
  thresholds: readonly {
    value: number;
    label?: string | undefined;
    tone?: Tone | undefined;
    axis: 'y' | 'y2';
  }[];
}

const timeOf = (node: XyChartNode): ResolvedXy['time'] => {
  const { x } = node;
  if (x.type !== 'time') {
    return undefined;
  }
  return {
    timeZone: x.timeZone ?? DEFAULT_TIME_ZONE,
    granularity:
      x.granularity ??
      defaultGranularity(
        node.series.flatMap(({ points }) => points.map(({ x: at }) => String(at)))
      ),
  };
};

const positionId = (node: XyChartNode, x: string | number): string =>
  node.x.type === 'time' ? String(timeValue(x as string)) : String(x);

const ordered = (node: XyChartNode, time: ResolvedXy['time']): XyPosition[] => {
  const { x } = node;
  const seen = new Map<string, string | number>();
  for (const { points } of node.series) {
    for (const point of points) {
      const id = positionId(node, point.x);
      if (!seen.has(id)) {
        seen.set(id, point.x);
      }
    }
  }
  if (x.type === 'category') {
    const categories = x.categories ?? [];
    const labels = printedLabels(categories);
    const declared = categories.map((category, index) => ({
      key: keyOf(category),
      label: labels[index]!,
    }));
    const declaredKeys = new Set(declared.map(({ key }) => key));
    return [
      ...declared,
      ...[...seen.values()]
        .map(String)
        .filter((key) => !declaredKeys.has(key))
        .map((key) => ({ key, label: key })),
    ];
  }
  const values = [...seen.values()];
  if (x.type === 'time') {
    return values
      .map(String)
      .sort((a, b) => timeValue(a) - timeValue(b))
      .map((key) => ({
        key,
        label: formatTime(key, time!),
      }));
  }
  return (values as number[])
    .sort((a, b) => a - b)
    .map((value) => ({
      key: String(value),
      label: formatValue(value, x.format),
    }));
};

export const resolveXy = (node: XyChartNode): ResolvedXy => {
  const time = timeOf(node);
  const positions = ordered(node, time);
  const printed = printedLabels(node.series);
  const index = new Map(
    positions.map(({ key }, at) => [node.x.type === 'time' ? String(timeValue(key)) : key, at])
  );
  return {
    positions,
    series: node.series.map((series, seriesIndex) => {
      const values: (number | null | undefined)[] = positions.map(() => undefined);
      for (const point of series.points) {
        values[index.get(positionId(node, point.x))!] = point.y;
      }
      return {
        key: keyOf(series),
        label: printed[seriesIndex]!,
        kind: series.kind ?? 'line',
        axis: series.axis ?? 'y',
        values,
      };
    }),
    stack: node.stack ?? 'none',
    missing: node.missing ?? 'gap',
    orientation: node.orientation ?? 'vertical',
    ...(time === undefined ? {} : { time }),
    thresholds: (node.thresholds ?? []).map(({ axis = 'y', ...threshold }) => ({
      ...threshold,
      axis,
    })),
  };
};
