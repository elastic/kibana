/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DomTextReading, PanelReading } from './browser_readers';

/** Bumped when the shape of the exported files changes. */
export const REVIEW_FORMAT = 'isomer-corpus-review/1';

/** The parts of a `capture.json` the export reads. */
export interface PanelCapture {
  dashboard_id: string;
  panel_id: string;
  in_as_code: boolean;
  chart_type: string | null;
  theme: string;
  context: {
    now: string;
    time_range: { absolute: { from: string; to: string } };
    ui_settings: Record<string, string>;
    page: { locale: string; devicePixelRatio: number };
    size: { width: number; height: number } | null;
  };
  panel: PanelReading;
}

export interface ExpectedText {
  text: string;
  /** For Elastic Charts metrics, which part of the metric drew the text (`echMetricText__value`). */
  part?: string;
  color?: string;
  background?: string;
}

export interface ExpectedAxis {
  position: string;
  title?: string;
  labels: string[];
}

export interface ExpectedChart {
  axes: { x: ExpectedAxis[]; y: ExpectedAxis[] };
  legend: Array<{ name: string; color: string }>;
  series: Array<{ kind: 'area' | 'bar' | 'line'; name: string; color: string }>;
  partitions: Array<{ name: string; depth: number; color: string }>;
  heatmap: Array<{ formatted: string; color: string }>;
  annotations: number;
}

/** The strings and colors a renderer must reproduce for one panel in one theme. */
export interface ExpectedStrings {
  format: typeof REVIEW_FORMAT;
  dashboard_id: string;
  panel_id: string;
  in_as_code: boolean;
  chart_type: string | null;
  theme: string;
  title: string | null;
  context: {
    now: string;
    time_range: { from: string; to: string };
    time_zone: string | null;
    locale: string;
    size: { width: number; height: number } | null;
  };
  charts: ExpectedChart[];
  metrics: Array<{ background?: string; texts: ExpectedText[] }>;
  tables: Array<{ headers: string[]; rows: ExpectedText[][] }>;
}

const toHexByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');

/**
 * Normalizes a CSS color to lowercase hex (`#rrggbb`, or `#rrggbbaa` when translucent), so DOM
 * readings (`rgb(…)`) and `DebugState` (hex) compare directly. Fully transparent is `undefined`.
 */
export const toHexColor = (color: string | undefined | null): string | undefined => {
  if (!color) {
    return undefined;
  }
  const trimmed = color.trim().toLowerCase();
  const rgb = trimmed.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/
  );
  if (rgb) {
    const [, red, green, blue, alphaText] = rgb;
    const alpha =
      alphaText === undefined
        ? 1
        : alphaText.endsWith('%')
        ? Number(alphaText.slice(0, -1)) / 100
        : Number(alphaText);
    if (alpha === 0) {
      return undefined;
    }
    const hex = `#${toHexByte(Number(red))}${toHexByte(Number(green))}${toHexByte(Number(blue))}`;
    return alpha < 1 ? `${hex}${toHexByte(alpha * 255)}` : hex;
  }
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    return `#${[...trimmed.slice(1)].map((digit) => digit + digit).join('')}`;
  }
  return trimmed === 'transparent' ? undefined : trimmed;
};

/**
 * EUI's data grid adds visually hidden characters for clipboard copies: `↦` after a cell, `↵`
 * after a row, `𐘂𐘂` around tabular content, and `✄𐘗…✄𐘗` around text that isn't copied (screen
 * reader hints). None of it is drawn, so it is removed from expected text.
 */
const EUI_NO_COPY = /✄𐘗[^✄]*✄𐘗/gu;
const EUI_COPY_MARKERS = /↦|↵|𐘂/gu;

export const toVisibleText = (text: string): string =>
  text.replace(EUI_NO_COPY, '').replace(EUI_COPY_MARKERS, '').trim();

const METRIC_PART = /\b(echMetricText__[A-Za-z]+)/;

const toText = ({ text, className, color, backgroundColor }: DomTextReading): ExpectedText => {
  const foreground = toHexColor(color);
  const background = toHexColor(backgroundColor);
  const part = className.match(METRIC_PART)?.[1];
  return {
    text: toVisibleText(text),
    ...(part ? { part } : {}),
    ...(foreground ? { color: foreground } : {}),
    ...(background ? { background } : {}),
  };
};

interface DebugStateLike {
  axes?: { x?: AxisLike[]; y?: AxisLike[] };
  legend?: { items?: Array<{ name: string; color: string }> };
  areas?: Array<{ name: string; color: string }>;
  bars?: Array<{ name: string; color: string }>;
  lines?: Array<{ name: string; color: string }>;
  partition?: Array<{ partitions?: Array<{ name: string; depth: number; color: string }> }>;
  heatmap?: { cells?: Array<{ formatted?: string; value?: unknown; fill: string }> };
  annotations?: unknown[];
}

interface AxisLike {
  position: string;
  title?: string;
  labels?: string[];
}

const toAxis = ({ position, title, labels = [] }: AxisLike): ExpectedAxis => ({
  position,
  ...(title ? { title } : {}),
  labels,
});

const toColor = (color: string) => toHexColor(color) ?? color;

/** Expected strings for one Elastic Charts chart, from its `DebugState`. */
export const toExpectedChart = (debugState: unknown): ExpectedChart => {
  const state = (debugState ?? {}) as DebugStateLike;
  const series = (kind: ExpectedChart['series'][number]['kind'], items = state[`${kind}s`]) =>
    (items ?? []).map(({ name, color }) => ({ kind, name, color: toColor(color) }));
  return {
    axes: {
      x: (state.axes?.x ?? []).map(toAxis),
      y: (state.axes?.y ?? []).map(toAxis),
    },
    legend: (state.legend?.items ?? []).map(({ name, color }) => ({ name, color: toColor(color) })),
    series: [...series('bar'), ...series('line'), ...series('area')],
    partitions: (state.partition ?? []).flatMap(({ partitions = [] }) =>
      partitions.map(({ name, depth, color }) => ({ name, depth, color: toColor(color) }))
    ),
    heatmap: (state.heatmap?.cells ?? []).map(({ formatted, value, fill }) => ({
      formatted: formatted ?? String(value),
      color: toColor(fill),
    })),
    annotations: state.annotations?.length ?? 0,
  };
};

/** The expected strings for one captured panel in one theme. */
export const toExpectedStrings = (capture: PanelCapture): ExpectedStrings => {
  const { panel, context } = capture;
  return {
    format: REVIEW_FORMAT,
    dashboard_id: capture.dashboard_id,
    panel_id: capture.panel_id,
    in_as_code: capture.in_as_code,
    chart_type: capture.chart_type,
    theme: capture.theme,
    title: panel.title,
    context: {
      now: context.now,
      time_range: context.time_range.absolute,
      time_zone: context.ui_settings['dateFormat:tz'] ?? null,
      locale: context.page.locale,
      size: context.size,
    },
    // Metrics draw HTML, and their `DebugState` is empty; they are read from the DOM below.
    charts: panel.charts
      .filter(({ debugState }) => debugState !== null)
      .map(({ debugState }) => toExpectedChart(debugState)),
    metrics: panel.metrics.map(({ backgroundColor, texts }) => {
      const background = toHexColor(backgroundColor);
      return { ...(background ? { background } : {}), texts: texts.map(toText) };
    }),
    tables: panel.dataGrids.map(({ headers, cells }) => {
      const rows = new Map<number, Array<{ column: number; text: ExpectedText }>>();
      for (const cell of cells) {
        const row = rows.get(cell.row) ?? [];
        row.push({ column: cell.column, text: toText(cell) });
        rows.set(cell.row, row);
      }
      return {
        headers: headers.map(({ text }) => toVisibleText(text)),
        rows: [...rows.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, row]) => row.sort((a, b) => a.column - b.column).map(({ text }) => text)),
      };
    }),
  };
};
