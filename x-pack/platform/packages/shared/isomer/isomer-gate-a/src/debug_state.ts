/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState, DebugStateValue } from '@elastic/charts';
import { normalizeColor } from './colors';
import type { NormalizedSeries, NormalizedXy, SeriesMark } from './model';
import { SERIES_MARK_ORDER } from './model';

const values = (points: DebugStateValue[]): NormalizedSeries['values'] =>
  points.map(({ x, y }) => ({ x: x as number | string, y: y ?? null }));

/**
 * An xy chart's Elastic Charts `DebugState`, normalized: spec ids and keys, which differ between
 * Kibana and Isomer by construction, are dropped; series are grouped by mark in a fixed order.
 */
export const normalizeDebugState = (state: DebugState): NormalizedXy => {
  const series: Record<SeriesMark, NormalizedSeries[]> = { area: [], bar: [], line: [] };
  for (const { name, color, bars } of state.bars ?? []) {
    series.bar.push({ mark: 'bar', name, color: normalizeColor(color), values: values(bars) });
  }
  for (const { name, color, points, path } of state.lines ?? []) {
    series.line.push({
      mark: 'line',
      name,
      color: normalizeColor(color),
      values: values(points),
      paths: [path],
    });
  }
  for (const { name, color, path, lines } of state.areas ?? []) {
    series.area.push({
      mark: 'area',
      name,
      color: normalizeColor(color),
      values: values(lines.y1.points),
      paths: [path, lines.y1.path, ...(lines.y0 ? [lines.y0.path] : [])],
    });
  }
  return {
    kind: 'xy',
    legend: (state.legend?.items ?? []).map(({ name, color }) => ({
      name,
      color: normalizeColor(color),
    })),
    axes: [...(state.axes?.x ?? []), ...(state.axes?.y ?? [])].map(
      ({ position, title, labels, values: axisValues, gridlines }) => ({
        position,
        ...(title ? { title } : {}),
        labels,
        values: axisValues,
        gridlines,
      })
    ),
    series: SERIES_MARK_ORDER.flatMap((mark) => series[mark]),
  };
};
