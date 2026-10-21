/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Reads a panel's exported Lens state for what the charts pack's spec leaves to the engine: presentation hints keyed
// by node id, the y extents the spec does carry, and the settings no node can carry faithfully yet.

import palettes from './kibana_palettes_borealis_light.json';
import type { ChartNode } from './bind_charts';

type Json = Record<string, unknown>;

interface Palette {
  type?: string;
  aliasOf?: string;
  byCount?: Record<string, string[]>;
}

const PALETTES = palettes as Record<string, Palette>;

/** Colors Kibana's Borealis light theme gives `count` series from `paletteId`, as `getKbnPalettes(...).get(id).colors(count)`. */
const paletteColors = (paletteId: string | undefined, count: number): string[] | undefined => {
  const entry = PALETTES[paletteId ?? 'default'];
  const palette = entry?.aliasOf ? PALETTES[entry.aliasOf] : entry;
  const capped = Math.min(Math.max(count, 1), 20);
  const colors = palette?.byCount?.[String(capped)];
  return colors && Array.from({ length: count }, (_, index) => colors[index % colors.length]!);
};

interface ColorMapping {
  paletteId?: string;
  assignments?: Array<{
    rules?: Array<{ type?: string; values?: unknown[]; value?: unknown }>;
    color?: { type?: string; colorIndex?: number; paletteId?: string; colorCode?: string };
  }>;
  specialAssignments?: Array<{
    rules?: Array<{ type?: string }>;
    color?: { type?: string; colorCode?: string };
  }>;
}

/** Resolves categories to hex the way Lens's `colorMapping` does: exact rules first, then the palette in loop order. */
const colorMappingColors = (
  mapping: ColorMapping,
  categories: readonly string[]
): Record<string, string> => {
  const colors: Record<string, string> = {};
  const unassigned: string[] = [];
  for (const category of categories) {
    const assignment = mapping.assignments?.find(({ rules }) =>
      rules?.some(({ values, value }) =>
        [...(values ?? []), value].some((candidate) => String(candidate) === category)
      )
    );
    const color = assignment?.color;
    if (color?.type === 'colorCode' && color.colorCode) {
      colors[category] = color.colorCode;
    } else if (color?.type === 'categorical' && color.colorIndex !== undefined) {
      const resolved = paletteColors(color.paletteId ?? mapping.paletteId, color.colorIndex + 1)?.[
        color.colorIndex
      ];
      if (resolved) {
        colors[category] = resolved;
      }
    } else {
      unassigned.push(category);
    }
  }
  const other = mapping.specialAssignments?.find(({ rules }) =>
    rules?.some(({ type }) => type === 'other')
  )?.color;
  const loop =
    other?.type === 'loop' ? paletteColors(mapping.paletteId, unassigned.length) : undefined;
  unassigned.forEach((category, index) => {
    const color = other?.type === 'colorCode' ? other.colorCode : loop?.[index];
    if (color) {
      colors[category] = color;
    }
  });
  return colors;
};

const visualizationOf = (lens: Json | undefined): Json =>
  ((lens?.state as Json | undefined)?.visualization as Json | undefined) ?? {};

const seriesKeys = (node: ChartNode): string[] =>
  ((node.series as Array<{ key?: string; label: string }> | undefined) ?? []).map(
    ({ key, label }) => key ?? label
  );

const rankedSeriesKeys = (node: ChartNode): string[] =>
  (
    (node.series as
      | Array<{ key?: string; label: string; points: Array<{ y: number | null }> }>
      | undefined) ?? []
  )
    .map(({ key, label, points }) => ({
      key: key ?? label,
      total: points.reduce((sum, { y }) => sum + (y ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .map(({ key }) => key);

const axisSettings = (visualization: Json, node: ChartNode) => {
  const pick = (name: string, axis: string) =>
    (visualization[name] as Json | undefined)?.[axis] as unknown;
  const axis = (lensAxis: 'x' | 'yLeft' | 'yRight') => {
    const settings = {
      title: pick('axisTitlesVisibilitySettings', lensAxis),
      tickLabels: pick('tickLabelsVisibilitySettings', lensAxis),
      gridlines: pick('gridlinesVisibilitySettings', lensAxis),
      labelOrientation: pick('labelsOrientation', lensAxis),
    };
    return Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined));
  };
  return { x: axis('x'), y: axis('yLeft'), ...(node.y2 ? { y2: axis('yRight') } : {}) };
};

const xyHints = (visualization: Json, node: ChartNode): Json => {
  const layers = ((visualization.layers as Json[] | undefined) ?? []).filter(
    ({ layerType }) => layerType === 'data' || layerType === undefined
  );
  const split = layers.some(({ splitAccessor }) => splitAccessor);
  // Lens assigns a split's palette in term rank order, which is total value, descending.
  const keys = split ? rankedSeriesKeys(node) : seriesKeys(node);
  const seriesColors: Record<string, string> = {};
  const layer = layers[0];
  const mapping = layer?.colorMapping as ColorMapping | undefined;
  const fromPalette = mapping
    ? colorMappingColors(mapping, keys)
    : Object.fromEntries(
        keys.map((key, index) => [
          key,
          paletteColors(
            (layer?.palette as Json | undefined)?.name as string | undefined,
            keys.length
          )![index]!,
        ])
      );
  Object.assign(seriesColors, fromPalette);
  if (!split) {
    for (const { yConfig } of layers) {
      for (const { forAccessor, color } of (yConfig as Json[] | undefined) ?? []) {
        if (typeof color === 'string' && keys.includes(String(forAccessor))) {
          seriesColors[String(forAccessor)] = color;
        }
      }
    }
  }
  const legend = (visualization.legend as Json | undefined) ?? {};
  // A split with no x draws its bars at one unlabeled position.
  const splitOnly = split && layers.every(({ xAccessor }) => !xAccessor);
  const axes = axisSettings(visualization, node);
  return {
    legend: {
      show: legend.isVisible !== false,
      ...(legend.position ? { position: legend.position } : {}),
      ...(legend.showSingleSeries !== undefined
        ? { showSingleSeries: legend.showSingleSeries }
        : {}),
      ...(legend.legendSize ? { size: legend.legendSize } : {}),
      ...(legend.shouldTruncate !== undefined
        ? { truncate: legend.shouldTruncate, maxLines: legend.maxLines }
        : {}),
    },
    valueLabels: visualization.valueLabels === 'show',
    seriesColors,
    colorSource: mapping
      ? `colorMapping ${mapping.paletteId ?? 'default'}`
      : `palette ${
          ((layer?.palette as Json | undefined)?.name as string | undefined) ?? 'default'
        }`,
    ...(visualization.curveType ? { curve: visualization.curveType } : {}),
    ...(visualization.fittingFunction ? { fitting: visualization.fittingFunction } : {}),
    ...(visualization.fillOpacity !== undefined ? { fillOpacity: visualization.fillOpacity } : {}),
    axes: splitOnly ? { ...axes, x: { ...axes.x, title: false, tickLabels: false } } : axes,
    ...(visualization.yTitle ? { yTitle: visualization.yTitle } : {}),
    ...(visualization.xTitle ? { xTitle: visualization.xTitle } : {}),
    ...(visualization.yRightTitle ? { y2Title: visualization.yRightTitle } : {}),
    ...(visualization.preferredSeriesType
      ? { lensSeriesType: visualization.preferredSeriesType }
      : {}),
  };
};

const partitionHints = (
  visualization: Json,
  node: ChartNode,
  colorRank: readonly string[] | undefined
): Json => {
  const layer = ((visualization.layers as Json[] | undefined) ?? [])[0] ?? {};
  const parts =
    ((node.parts ?? node.items) as Array<{ key?: string; label: string }> | undefined) ?? [];
  const keys = colorRank ?? parts.map(({ key, label }) => key ?? label);
  const mapping = layer.colorMapping as ColorMapping | undefined;
  const paletteName = (visualization.palette as Json | undefined)?.name as string | undefined;
  const colors = mapping
    ? colorMappingColors(mapping, keys)
    : Object.fromEntries(
        keys.map((key, index) => [key, paletteColors(paletteName, keys.length)![index]!])
      );
  return {
    ...(visualization.shape ? { shape: visualization.shape } : {}),
    legend: {
      show: layer.legendDisplay !== 'hide',
      ...(layer.legendDisplay ? { display: layer.legendDisplay } : {}),
      ...(visualization.legendPosition ? { position: visualization.legendPosition } : {}),
      ...(layer.nestedLegend !== undefined ? { nested: layer.nestedLegend } : {}),
      ...(layer.legendSize ? { size: layer.legendSize } : {}),
    },
    ...(layer.numberDisplay ? { numberDisplay: layer.numberDisplay } : {}),
    ...(layer.categoryDisplay ? { categoryDisplay: layer.categoryDisplay } : {}),
    seriesColors: colors,
    colorSource: mapping
      ? `colorMapping ${mapping.paletteId ?? 'default'}`
      : `palette ${paletteName ?? 'default'}`,
  };
};

const metricHints = (visualization: Json, node: ChartNode): Json => {
  const banded = visualization.palette ? metricBands(visualization, node) : undefined;
  return {
    ...(banded && typeof banded !== 'string'
      ? {
          colors: Object.fromEntries(banded.colors.map((color, index) => [`band:${index}`, color])),
        }
      : {}),
    ...(node.type === 'gauge' && visualization.showBar
      ? { progress: visualization.progressDirection ?? 'vertical' }
      : {}),
    ...metricStyle(visualization),
  };
};

const metricStyle = (visualization: Json): Json => ({
  ...(typeof visualization.color === 'string' ? { color: visualization.color } : {}),
  ...(visualization.showBar !== undefined ? { showBar: visualization.showBar } : {}),
  ...(visualization.progressDirection
    ? { progressDirection: visualization.progressDirection }
    : {}),
  ...(visualization.titlesTextAlign ? { titlesTextAlign: visualization.titlesTextAlign } : {}),
  ...(visualization.valuesTextAlign ? { valuesTextAlign: visualization.valuesTextAlign } : {}),
});

/** Presentation the spec leaves to the engine, for `node` bound from `lens`. Never part of the composition. */
export const presentationHints = (
  lens: Json | undefined,
  node: ChartNode,
  {
    hidePanelTitles,
    colorRank,
  }: { hidePanelTitles?: boolean; colorRank?: readonly string[] | undefined }
): Json => {
  const visualization = visualizationOf(lens);
  const byType: Record<string, () => Json> = {
    lnsXY: () => xyHints(visualization, node),
    lnsPie: () => partitionHints(visualization, node, colorRank),
    lnsMetric: () => metricHints(visualization, node),
    lnsHeatmap: () => {
      const banded = heatmapBands(visualization, node);
      const legend = (visualization.legend as Json | undefined) ?? {};
      const grid = (visualization.gridConfig as Json | undefined) ?? {};
      return {
        ...(typeof banded === 'string'
          ? {}
          : {
              colors: Object.fromEntries(
                banded.colors.map((color, index) => [`band:${index}`, color])
              ),
            }),
        legend: {
          show: legend.isVisible !== false,
          ...(legend.position ? { position: legend.position } : {}),
        },
        axes: {
          x: { title: grid.isXAxisTitleVisible, tickLabels: grid.isXAxisLabelVisible },
          y: { title: grid.isYAxisTitleVisible, tickLabels: grid.isYAxisLabelVisible },
        },
        cellLabels: grid.isCellLabelVisible === true,
      };
    },
  };
  const type = lens?.visualizationType as string | undefined;
  return {
    lensType: type,
    ...(hidePanelTitles ? { panelTitle: false } : {}),
    ...(type ? byType[type]?.() : {}),
  };
};

interface XySeries {
  key?: string;
  label: string;
  kind?: string;
  axis?: string;
  points: Array<{ x: string | number; y: number | null }>;
}

/** Orders a split's series as Lens's legend does: by term rank, which is total value, descending. */
const rankSeries = (node: ChartNode) => {
  const series = node.series as XySeries[] | undefined;
  const total = ({ points }: XySeries) => points.reduce((sum, { y }) => sum + (y ?? 0), 0);
  series?.sort((a, b) => total(b) - total(a));
};

/**
 * A Lens layer split by a term with no x draws one bar per term as its own series. The lowering hands it over as
 * one series over a category x, so each category becomes a series at a single, unlabeled x.
 */
const splitOnlyToSeries = (node: ChartNode) => {
  const [only, ...rest] = (node.series as XySeries[] | undefined) ?? [];
  if (!only || rest.length > 0) {
    return;
  }
  const at = only.label;
  node.series = only.points.map(({ x, y }) => ({
    label: String(x),
    ...(only.kind ? { kind: only.kind } : {}),
    points: [{ x: at, y }],
  }));
  node.x = { type: 'category' };
  const selection = node.selection as { on?: Record<string, unknown> } | undefined;
  if (selection?.on?.x) {
    selection.on = { series: selection.on.x };
  }
};

type Tone = 'neutral' | 'success' | 'warning' | 'risk' | 'danger';

/** The status a Lens palette color reads as, by hue: red, orange, yellow, green, or anything else. */
export const toneOfColor = (hex: string): Tone => {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!match) {
    return 'neutral';
  }
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255) as [
    number,
    number,
    number
  ];
  const max = Math.max(r, g, b);
  const chroma = max - Math.min(r, g, b);
  if (chroma < 0.15) {
    return 'neutral';
  }
  const hue =
    (max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4) *
    60;
  const degrees = (hue + 360) % 360;
  return degrees < 20 || degrees >= 340
    ? 'danger'
    : degrees < 40
    ? 'risk'
    : degrees < 70
    ? 'warning'
    : degrees < 175
    ? 'success'
    : 'neutral';
};

interface PaletteParams {
  rangeType?: 'number' | 'percent';
  rangeMin?: number | null;
  rangeMax?: number | null;
  continuity?: 'all' | 'above' | 'below' | 'none';
  stops?: Array<{ color: string; stop: number }>;
  colorStops?: Array<{ color: string; stop: number }>;
}

export interface MetricBand {
  from?: number;
  tone: Tone;
}

/**
 * A Lens metric's color-by-value palette as ascending bands with absolute starts, and each band's exact color.
 * Percent stops resolve against the gauge's domain; a metric without one cannot place them.
 */
export const metricBands = (
  visualization: Json,
  node: ChartNode
): { bands: MetricBand[]; colors: string[] } | string => {
  const params = ((visualization.palette as Json | undefined)?.params ?? {}) as PaletteParams;
  const starts =
    params.colorStops && params.colorStops.length > 0
      ? params.colorStops
      : (params.stops ?? []).map(({ color }, index, stops) => ({
          color,
          stop: index === 0 ? params.rangeMin ?? 0 : stops[index - 1]!.stop,
        }));
  if (starts.length === 0) {
    return 'color by value without stops';
  }
  let resolve = (stop: number) => stop;
  if (params.rangeType === 'percent') {
    const domain = node.domain as { min: number; max: number } | undefined;
    if (!domain) {
      return 'color by value in percent on a metric without a max';
    }
    resolve = (stop) => domain.min + ((domain.max - domain.min) * stop) / 100;
  }
  // `all` and `below` extend the first color down; `above` and `none` leave values below it without one.
  const openBelow = params.continuity === 'all' || params.continuity === 'below';
  if (params.continuity === 'none' || params.continuity === 'below') {
    return `color by value with continuity ${params.continuity}`;
  }
  return {
    bands: starts.map(({ color, stop }, index) => ({
      ...(index === 0 && openBelow ? {} : { from: resolve(stop) }),
      tone: toneOfColor(color),
    })),
    colors: starts.map(({ color }) => color),
  };
};

/**
 * Lens's stepped heatmap palette as `bands` over the data's range, with its exact colors. Lens's default is five
 * equal steps of `temperature` from the smallest to the largest cell; the last step is open above.
 */
export const heatmapBands = (
  visualization: Json,
  node: ChartNode
): { bands: Json[]; colors: string[] } | string => {
  const values = ((node.cells as Array<{ value: number | null }> | undefined) ?? []).flatMap(
    ({ value }) => (value === null ? [] : [value])
  );
  if (values.length === 0) {
    return 'a heatmap with no values';
  }
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const params = ((visualization.palette as Json | undefined)?.params ?? {}) as PaletteParams & {
    name?: string;
    steps?: number;
  };
  const paletteName =
    ((visualization.palette as Json | undefined)?.name as string | undefined) ?? 'temperature';
  const custom = params.colorStops && params.colorStops.length > 0 ? params.colorStops : undefined;
  if (params.continuity && params.continuity !== 'above') {
    return `heatmap palette with continuity ${params.continuity}`;
  }
  const steps = custom?.length ?? params.steps ?? 5;
  const colors = custom?.map(({ color }) => color) ?? paletteColors(paletteName, steps);
  if (!colors) {
    return `heatmap palette ${paletteName}`;
  }
  const resolve = (stop: number) =>
    params.rangeType === 'number' ? stop : min + ((max - min) * stop) / 100;
  const starts = custom
    ? custom.map(({ stop }) => resolve(stop))
    : colors.map((_, index) => min + ((max - min) * index) / steps);
  return {
    bands: starts.map((from, index) => ({
      from: Number(from.toFixed(6)),
      ...(index < starts.length - 1 ? { to: Number(starts[index + 1]!.toFixed(6)) } : {}),
    })),
    colors,
  };
};

const applyHeatmapState = (
  visualization: Json,
  columns: Record<string, LensColumn & { params?: { size?: number } }>,
  node: ChartNode
): string[] => {
  const refusals: string[] = [];
  const banded = heatmapBands(visualization, node);
  if (typeof banded === 'string') {
    refusals.push(banded);
  } else {
    node.colorScale = { type: 'bands', bands: banded.bands };
  }
  const xColumn = columns[visualization.xAccessor as string] as LensColumn & {
    params?: { interval?: string };
  };
  const fixed = /^(\d+)(ms|s|m|h|d|w)$/.exec(xColumn?.params?.interval ?? '');
  if (
    xColumn?.operationType === 'date_histogram' &&
    !xColumn.customLabel &&
    xColumn.label &&
    fixed
  ) {
    const unit = (
      { ms: 'millisecond', s: 'second', m: 'minute', h: 'hour', d: 'day', w: 'week' } as const
    )[fixed[2] as 'ms'];
    (node.x as Json).title = perInterval(xColumn.label, { value: Number(fixed[1]), unit });
  }
  // Lens's rows are the top terms by the value, largest first; the lowering keeps every term in key order.
  const yColumn = columns[visualization.yAccessor as string];
  if (yColumn?.operationType === 'terms' && node.y) {
    const totals = new Map<string, number>();
    for (const { y, value } of (node.cells as Array<{ y?: string; value: number | null }>) ?? []) {
      totals.set(y!, (totals.get(y!) ?? 0) + (value ?? 0));
    }
    const ranked = [...totals].sort((a, b) => b[1] - a[1]).map(([key]) => key);
    const size = yColumn.params?.size;
    if (size !== undefined && ranked.length > size) {
      refusals.push(`heatmap rows past the top ${size} terms`);
    }
    (node.y as Json).categories = ranked.map((key) => ({ key, label: key }));
  }
  return refusals;
};

interface LensColumn {
  operationType?: string;
  label?: string;
  customLabel?: boolean;
  params?: { includeEmptyRows?: boolean };
}

const columnsOf = (lens: Json | undefined): Record<string, LensColumn> => {
  const layers = ((
    ((lens?.state as Json | undefined)?.datasourceStates as Json | undefined)?.formBased as
      | Json
      | undefined
  )?.layers ?? {}) as Record<string, { columns?: Record<string, LensColumn> }>;
  return Object.assign({}, ...Object.values(layers).map(({ columns }) => columns ?? {}));
};

const UNIT_MS: Record<string, number> = {
  millisecond: 1,
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

/** Lens's title for a date histogram it labels itself, e.g. `timestamp per hour` or `order_date per 12 hours`. */
const perInterval = (label: string, { value, unit }: { value: number; unit: string }) =>
  `${label} per ${value === 1 ? unit : `${value} ${unit}s`}`;

/**
 * Lens's date histograms keep empty buckets, so a count or sum there is 0; ES|QL drops them. Fills each series
 * across the window at the interval, for intervals ES|QL aligns to the epoch.
 */
const fillEmptyBuckets = (node: ChartNode, zeroFilled: (series: XySeries) => boolean) => {
  const x = node.x as {
    interval?: { value: number; unit: string };
    domain?: { from: string; to: string };
  };
  const unitMs = x.interval && UNIT_MS[x.interval.unit];
  if (!x.domain || !unitMs) {
    return;
  }
  const step = x.interval!.value * unitMs;
  const from = Math.floor(Date.parse(x.domain.from) / step) * step;
  const to = Date.parse(x.domain.to);
  for (const series of (node.series as XySeries[] | undefined) ?? []) {
    if (!zeroFilled(series)) {
      continue;
    }
    const present = new Set(series.points.map(({ x: at }) => Date.parse(String(at))));
    for (let at = from; at < to; at += step) {
      if (!present.has(at)) {
        series.points.push({ x: new Date(at).toISOString(), y: 0 });
      }
    }
    series.points.sort((a, b) => Date.parse(String(a.x)) - Date.parse(String(b.x)));
  }
};

const ZERO_WHEN_EMPTY = new Set(['count', 'sum']);

interface Extent {
  mode?: string;
  lowerBound?: number;
  upperBound?: number;
  enforce?: boolean;
}

/** Lens's `validateExtent`: both ends, in order, spanning zero when the axis holds bars or areas. */
const validExtent = ({ lowerBound, upperBound }: Extent, hasBarOrArea: boolean) =>
  lowerBound != null &&
  upperBound != null &&
  upperBound > lowerBound &&
  (!hasBarOrArea || (lowerBound <= 0 && upperBound >= 0));

/** The domain Lens's XY expression applies: a custom extent only when it is valid or enforced. */
const domainOf = (
  extent: Extent,
  hasBarOrArea: boolean,
  refuse: (reason: string) => void,
  axis: string
) => {
  const { mode, lowerBound, upperBound, enforce } = extent;
  if (mode === 'custom') {
    return validExtent(extent, hasBarOrArea) || enforce
      ? {
          ...(lowerBound != null ? { min: lowerBound } : {}),
          ...(upperBound != null ? { max: upperBound } : {}),
        }
      : undefined;
  }
  if (mode && mode !== 'full' && mode !== 'dataBounds') {
    refuse(`${axis} extent mode ${mode}`);
  }
  return undefined;
};

/**
 * Applies the y extents and scales the spec carries to an `xyChart`, and returns what the panel's Lens state holds
 * that no node can carry faithfully yet.
 */
export const applyLensState = (lens: Json | undefined, node: ChartNode): string[] => {
  const refusals: string[] = [];
  const refuse = (reason: string) => refusals.push(reason);
  const visualization = visualizationOf(lens);
  const type = lens?.visualizationType as string | undefined;

  if (type === 'lnsXY') {
    const dataLayers = ((visualization.layers as Json[] | undefined) ?? []).filter(
      ({ layerType }) => layerType === 'data' || layerType === undefined
    );
    if (dataLayers.some(({ splitAccessor }) => splitAccessor)) {
      if (dataLayers.every(({ xAccessor }) => !xAccessor)) {
        splitOnlyToSeries(node);
      }
      rankSeries(node);
    } else {
      const accessors = dataLayers.flatMap(
        ({ accessors: ids }) => (ids as string[] | undefined) ?? []
      );
      const at = ({ key, label }: XySeries) => accessors.indexOf(key ?? label);
      (node.series as XySeries[] | undefined)?.sort((a, b) => at(a) - at(b));
    }
    const columns = columnsOf(lens);
    const xColumn = columns[dataLayers[0]?.xAccessor as string];
    const x = node.x as {
      type?: string;
      title?: string;
      interval?: { value: number; unit: string };
    };
    if (xColumn?.operationType === 'date_histogram' && x.type === 'time') {
      if (!xColumn.customLabel && x.interval && xColumn.label) {
        x.title = perInterval(xColumn.label, x.interval);
      }
      if (xColumn.params?.includeEmptyRows !== false) {
        const accessors = dataLayers.flatMap(
          ({ accessors: ids }) => (ids as string[] | undefined) ?? []
        );
        const split = dataLayers.some(({ splitAccessor }) => splitAccessor);
        const operationOf = ({ key, label }: XySeries) =>
          columns[split ? accessors[0]! : key ?? label]?.operationType;
        fillEmptyBuckets(node, (series) => ZERO_WHEN_EMPTY.has(operationOf(series) ?? ''));
      }
    }
    for (const layer of (visualization.layers as Json[] | undefined) ?? []) {
      if (layer.layerType === 'referenceLine') {
        refuse('reference line layer: not mapped to thresholds yet');
      }
    }
    const y = node.y as Json | undefined;
    const series = (node.series as XySeries[] | undefined) ?? [];
    const barOrArea = (axis: string) =>
      series.some(({ kind, axis: on = 'y' }) => on === axis && (kind === 'bar' || kind === 'area'));
    const domain = domainOf(
      (visualization.yLeftExtent as Extent | undefined) ?? {},
      barOrArea('y'),
      refuse,
      'y'
    );
    if (domain && Object.keys(domain).length > 0 && y) {
      y.domain = domain;
    }
    const y2 = node.y2 as Json | undefined;
    const domain2 = y2
      ? domainOf(
          (visualization.yRightExtent as Extent | undefined) ?? {},
          barOrArea('y2'),
          refuse,
          'y2'
        )
      : undefined;
    if (domain2 && Object.keys(domain2).length > 0 && y2) {
      y2.domain = domain2;
    }
    for (const [lensScale, axis] of [
      [visualization.yLeftScale, y],
      [visualization.yRightScale, y2],
    ] as const) {
      if (lensScale === 'log' && axis) {
        (axis as Json).scale = 'log';
      } else if (lensScale && lensScale !== 'linear') {
        refuse(`y scale ${String(lensScale)}`);
      }
    }
  }

  if (type === 'lnsMetric') {
    if (visualization.palette) {
      const banded = metricBands(visualization, node);
      if (typeof banded === 'string') {
        refuse(banded);
      } else if (node.type === 'gauge') {
        // A gauge's bands run from `domain.min`, so a first band starting above it would color values Lens leaves plain.
        const { min, max } = node.domain as { min: number; max: number };
        const [first] = banded.bands;
        if (first?.from !== undefined && first.from > min) {
          refuse('a gauge whose first color starts above its minimum');
        } else {
          node.bands = banded.bands
            .map(({ tone }, index) => ({
              to: Math.min(banded.bands[index + 1]?.from ?? max, max),
              tone,
            }))
            .filter(({ to }, index, bands) => to > (index === 0 ? min : bands[index - 1]!.to));
        }
      } else {
        node.bands = banded.bands;
      }
    }
    if (visualization.secondaryMetricAccessor) {
      refuse('secondary metric');
    }
    if (visualization.breakdownByAccessor) {
      refuse('breakdown into a grid of metrics');
    }
  }

  if (type === 'lnsHeatmap' && node.type === 'heatmap') {
    refusals.push(...applyHeatmapState(visualization, columnsOf(lens), node));
  }

  const groups =
    ((visualization.layers as Json[] | undefined)?.[0]?.primaryGroups as unknown[] | undefined)
      ?.length ?? 0;
  if (type === 'lnsPie' && (groups > 2 || (groups === 2 && visualization.shape !== 'treemap'))) {
    refuse('more than one slice-by dimension');
  }
  return refusals;
};
