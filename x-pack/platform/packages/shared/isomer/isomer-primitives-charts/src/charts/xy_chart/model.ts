/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from '../../model/format';
import { keyOf, printedLabels } from '../../model/identity';
import {
  bucketEnd,
  DEFAULT_TIME_ZONE,
  defaultGranularity,
  formatTime,
  type Granularity,
  timeValue,
} from '../../model/time';
import type { Tone } from '../../model/tone';
import { glyph } from '../../theme/glyph';

import type { XyChartNode } from './schema';

export interface XyPosition {
  /** The point `x` as authored: the selection key on `x`. */
  key: string;
  /** As every surface prints it: a bin as its range. */
  label: string;
  /** A time bucket that runs past the queried window, so it may hold part of its data. */
  partial?: true;
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
  time?: {
    timeZone: string;
    granularity: Granularity;
    /** The shortest bucket in milliseconds, present with an `interval`. */
    interval?: number;
    /** The queried window in milliseconds since the epoch. */
    window?: { from: number; to: number };
  };
  /** The bin width of a binned `number` x. */
  bin?: number;
  thresholds: readonly {
    value: number;
    label?: string | undefined;
    tone?: Tone | undefined;
    axis: 'y' | 'y2';
  }[];
  annotations: readonly XyAnnotation[];
}

export interface XyAnnotation {
  key: string;
  /** As every surface prints it: followed by the key where another annotation shares the label. */
  label: string;
  /** Where it sits on the axis: milliseconds on a time x, the number on a number x, the key on a category x. */
  at: number | string;
  until?: number | string;
  /** Where it sits as every surface prints it: a moment, or a range. */
  span: string;
  tone?: Tone | undefined;
}

const timeOf = (node: XyChartNode): ResolvedXy['time'] => {
  const { x } = node;
  if (x.type !== 'time') {
    return undefined;
  }
  const timeZone = x.timeZone ?? DEFAULT_TIME_ZONE;
  const starts = [
    ...new Set(
      node.series.flatMap(({ points }) => points.map(({ x: at }) => timeValue(String(at))))
    ),
  ].sort((a, b) => a - b);
  const window = x.domain && {
    from: timeValue(x.domain.from),
    to: timeValue(x.domain.to),
  };
  const { interval } = x;
  return {
    timeZone,
    granularity:
      x.granularity ??
      defaultGranularity(
        node.series.flatMap(({ points }) => points.map(({ x: at }) => String(at)))
      ),
    ...(interval === undefined
      ? {}
      : {
          // The shortest bucket, or the closest two starts if nearer.
          interval: Math.min(
            ...(starts.length === 0 ? [window?.from ?? 0] : starts).map(
              (start) => bucketEnd(start, interval, timeZone) - start
            ),
            ...starts.slice(1).map((start, index) => start - starts[index]!)
          ),
        }),
    ...(window === undefined ? {} : { window }),
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
    const { interval, domain } = x;
    return values
      .map(String)
      .sort((a, b) => timeValue(a) - timeValue(b))
      .map((key) => {
        const start = timeValue(key);
        const partial =
          interval !== undefined &&
          domain !== undefined &&
          (start < time!.window!.from ||
            bucketEnd(start, interval, time!.timeZone) > time!.window!.to);
        return {
          key,
          label: formatTime(key, time!),
          ...(partial ? { partial: true as const } : {}),
        };
      });
  }
  const { interval, format } = x;
  return (values as number[])
    .sort((a, b) => a - b)
    .map((value) => ({
      key: String(value),
      label:
        interval === undefined
          ? formatValue(value, format)
          : `${formatValue(value, format)}${glyph.range}${formatValue(value + interval, format)}`,
    }));
};

const annotationsOf = (
  node: XyChartNode,
  positions: readonly XyPosition[],
  time: ResolvedXy['time']
): XyAnnotation[] => {
  const { x, annotations = [] } = node;
  const printed = printedLabels(annotations);
  const place = (value: string | number): number | string =>
    x.type === 'time' ? timeValue(String(value)) : value;
  const print = (value: string | number): string =>
    x.type === 'time'
      ? formatTime(String(value), time!)
      : x.type === 'number'
      ? formatValue(Number(value), x.format)
      : positions.find(({ key }) => key === value)?.label ?? String(value);
  return annotations.map(({ at, until, tone }, index) => ({
    key: keyOf(annotations[index]!),
    label: printed[index]!,
    at: place(at),
    ...(until === undefined ? {} : { until: place(until) }),
    span: until === undefined ? print(at) : `${print(at)}${glyph.range}${print(until)}`,
    ...(tone === undefined ? {} : { tone }),
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
    ...(node.x.type === 'number' && node.x.interval !== undefined ? { bin: node.x.interval } : {}),
    annotations: annotationsOf(node, positions, time),
    thresholds: (node.thresholds ?? []).map(({ axis = 'y', ...threshold }) => ({
      ...threshold,
      axis,
    })),
  };
};
