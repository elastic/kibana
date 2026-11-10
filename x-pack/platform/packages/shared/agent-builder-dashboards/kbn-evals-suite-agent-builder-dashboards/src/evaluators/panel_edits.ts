/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';
import { compact } from 'lodash';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { parseVegaSpec } from '@kbn/dashboard-agent-authoring';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { matchConfig } from '../config_gold';
import {
  byReadingOrder,
  getLeafPanels,
  getPanelContainers,
  getPanelKind,
  isRecord,
} from '../dashboard_panels';
import { hasWrittenDashboard } from '../extract_dashboard';
import { noDashboardResult, scoreChecks, skippedResult, type Check } from '../evaluator_utils';
import type { DashboardAgentEvaluator, LayoutItem, PanelColorName, PanelEditGold } from '../types';

export const DASHBOARD_PANEL_EDITS_EVALUATOR_NAME = 'Dashboard Panel Edits';

const collectStaticColors = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectStaticColors);
  }
  if (!isRecord(value)) {
    return [];
  }
  if (value.type === 'static' && typeof value.color === 'string') {
    return [value.color];
  }
  return Object.values(value).flatMap(collectStaticColors);
};

/** XY layers that draw no data series. */
const NON_SERIES_LAYER_TYPES = new Set(['reference_lines', 'annotations', 'annotation_group']);

/**
 * Lens static colors (`{ type: 'static', color }`) in the data layers: the
 * colors a series is drawn in, not palettes, categorical mappings, reference
 * lines or annotations.
 */
const collectLensSeriesColors = (layers: unknown): string[] =>
  Array.isArray(layers)
    ? layers
        .filter((layer) => !(isRecord(layer) && NON_SERIES_LAYER_TYPES.has(String(layer.type))))
        .flatMap(collectStaticColors)
    : collectStaticColors(layers);

const VEGA_COLOR_CHANNELS = ['color', 'fill', 'stroke'] as const;
const VEGA_NESTED_VIEWS = ['layer', 'marks', 'spec', 'concat', 'hconcat', 'vconcat'] as const;
/** `config` keys that style one mark type; `config.mark` styles them all. */
const VEGA_MARK_CONFIGS = [
  'arc',
  'area',
  'bar',
  'circle',
  'line',
  'path',
  'point',
  'rect',
  'rule',
  'square',
  'symbol',
  'tick',
  'trail',
] as const;

const isString = (value: unknown): value is string => typeof value === 'string';

/** A literal color: a bare string, or a Vega `{ value }` encoding. */
const literalColor = (value: unknown): string[] => {
  if (isString(value)) {
    return [value];
  }
  return isRecord(value) && isString(value.value) ? [value.value] : [];
};

/** A color scale's scheme name (`blues`) and range colors. */
const scaleColors = (scale: unknown): string[] => {
  if (!isRecord(scale)) {
    return [];
  }
  const { scheme, range } = scale;
  const schemeName = (value: unknown): unknown => (isRecord(value) ? value.name : value);
  return [
    ...[scheme, isRecord(range) ? range.scheme : undefined].map(schemeName).filter(isString),
    ...(Array.isArray(range) ? range.filter(isString) : []),
  ];
};

const channelColors = (encoding: unknown): string[] =>
  isRecord(encoding)
    ? VEGA_COLOR_CHANNELS.flatMap((channel) => {
        const value = encoding[channel];
        return [...literalColor(value), ...(isRecord(value) ? scaleColors(value.scale) : [])];
      })
    : [];

/**
 * The colors a view sets on its own mark: color encodings, and mark properties
 * for the channels no encoding sets, since an encoding overrides them.
 */
const ownMarkColors = ({ mark, encoding, encode }: Record<string, unknown>): string[] => [
  ...channelColors(
    isRecord(mark) && isRecord(encoding)
      ? Object.fromEntries(Object.entries(mark).filter(([key]) => encoding[key] === undefined))
      : mark
  ),
  ...channelColors(encoding),
  ...(isRecord(encode) ? Object.values(encode).flatMap(channelColors) : []),
];

/**
 * Colors a Vega or Vega-Lite view paints its marks in: the mark's own color
 * properties, color encodings and their scales, and declared scales, in nested
 * views too. Axis, title and background styling do not count.
 */
const collectVegaMarkColors = (view: unknown): string[] => {
  if (Array.isArray(view)) {
    return view.flatMap(collectVegaMarkColors);
  }
  if (!isRecord(view)) {
    return [];
  }
  const { scales } = view;
  return [
    ...ownMarkColors(view),
    ...(Array.isArray(scales) ? scales.flatMap(scaleColors) : []),
    ...VEGA_NESTED_VIEWS.flatMap((key) => collectVegaMarkColors(view[key])),
  ];
};

/** A Vega-Lite `mark` (`'bar'` or `{ type: 'bar' }`), or a Vega mark's `type`. */
const markTypeOf = ({ mark, type, encode }: Record<string, unknown>): string | undefined => {
  if (isString(mark)) {
    return mark;
  }
  if (isRecord(mark) && isString(mark.type)) {
    return mark.type;
  }
  return isRecord(encode) && isString(type) ? type : undefined;
};

/** Mark types unfilled by default, so drawn by their stroke; the rest are drawn by their fill. */
const UNFILLED_MARK_TYPES = new Set(['line', 'rule', 'point']);

interface DrawnMark {
  type: string;
  /** The mark's own color sources: mark properties and encodings. */
  sources: Array<Record<string, unknown>>;
}

/** The marks a view draws, in nested views too. */
const collectDrawnMarks = (view: unknown): DrawnMark[] => {
  if (Array.isArray(view)) {
    return view.flatMap(collectDrawnMarks);
  }
  if (!isRecord(view)) {
    return [];
  }
  const { mark, encoding, encode } = view;
  const type = markTypeOf(view);
  const sources = [mark, encoding, ...(isRecord(encode) ? Object.values(encode) : [])].filter(
    isRecord
  );
  return [
    ...(type !== undefined ? [{ type, sources }] : []),
    ...VEGA_NESTED_VIEWS.flatMap((key) => collectDrawnMarks(view[key])),
  ];
};

/**
 * The color the root `config` draws a mark in: the mark type's entry merged
 * over `config.mark`, read from the channel the mark is drawn by (`fill`, or
 * `stroke` when the mark, its config or its type leaves it unfilled), which
 * takes precedence over the generic `color`. A mark that declares that channel
 * or `color` itself, in any form (a literal, a field, a signal or a scale),
 * takes no config color. Defaults for mark types the spec does not draw do not count.
 */
const collectVegaConfigColors = (spec: unknown): string[] => {
  if (!isRecord(spec) || !isRecord(spec.config)) {
    return [];
  }
  const { config } = spec;
  return collectDrawnMarks(spec).flatMap(({ type, sources }) => {
    const typeConfig = VEGA_MARK_CONFIGS.some((key) => key === type) ? config[type] : undefined;
    const merged = {
      ...(isRecord(config.mark) ? config.mark : {}),
      ...(isRecord(typeConfig) ? typeConfig : {}),
    };
    const ownFilled = sources.map(({ filled }) => filled).find((filled) => filled !== undefined);
    const filled = ownFilled ?? merged.filled ?? !UNFILLED_MARK_TYPES.has(type);
    const drawChannel = filled === true ? 'fill' : 'stroke';
    if (sources.some((source) => source[drawChannel] !== undefined || source.color !== undefined)) {
      return [];
    }
    const channelColor = literalColor(merged[drawChannel]);
    return channelColor.length > 0 ? channelColor : literalColor(merged.color);
  });
};

const getPanelColors = ({ type, config }: AttachmentPanel): string[] => {
  if (type !== 'vega') {
    return collectLensSeriesColors(config.layers);
  }
  const spec = parseVegaSpec(config.spec);
  return [...collectVegaMarkColors(spec), ...collectVegaConfigColors(spec)];
};

const MIN_SATURATION = 0.4;
/** HSV value below which a color reads as near black, whatever its hue. */
const MIN_VALUE = 0.25;
/** Each named hue in degrees, and the window around it a requested color may fall in. */
const NAMED_HUES: Record<PanelColorName, { hue: number; tolerance: number }> = {
  red: { hue: 0, tolerance: 20 },
  blue: { hue: 220, tolerance: 25 },
};

/** HSV of any CSS color; undefined for anything chroma cannot read. */
const toHsv = (color: string): { hue: number; saturation: number; value: number } | undefined => {
  if (!chroma.valid(color)) {
    return undefined;
  }
  const [hue, saturation, value] = chroma(color).hsv();
  return { hue: Number.isNaN(hue) ? 0 : hue, saturation, value };
};

/**
 * A color near the hue, saturated and bright enough, in any CSS form
 * (`#BD271E`, `rgb(189, 39, 30)`, `steelblue`), so a pale tint such as
 * `aliceblue` or `#ffcccc` and a near black such as `#330000` do not pass.
 * The Vega scheme of the hue (`blues`) counts too.
 */
export const matchesColorName = (color: string, name: PanelColorName): boolean => {
  if (color.trim().toLowerCase() === `${name}s`) {
    return true;
  }
  const parsed = toHsv(color.trim());
  if (!parsed || parsed.saturation < MIN_SATURATION || parsed.value < MIN_VALUE) {
    return false;
  }
  const { hue, tolerance } = NAMED_HUES[name];
  const distance = Math.abs(parsed.hue - hue);
  return Math.min(distance, 360 - distance) <= tolerance;
};

const getVegaMarkTypes = ({ type, config }: AttachmentPanel): string[] =>
  type === 'vega' ? collectDrawnMarks(parseVegaSpec(config.spec)).map((mark) => mark.type) : [];

const BULLET_ITEM = /^\s*[-*+]\s+\S/;

const countBulletItems = (content: string): number =>
  content.split('\n').filter((line) => BULLET_ITEM.test(line)).length;

/** The panel as config gold sees it: a Vega spec parsed into an object. */
const toMatchedPanel = ({ type, config }: AttachmentPanel): Record<string, unknown> => ({
  type,
  config: type === 'vega' ? { ...config, spec: parseVegaSpec(config.spec) } : config,
});

/** A seed panel by id, or the first panel of the kind, in reading order, that the seed lacks. */
const resolvePanel = (
  item: LayoutItem,
  dashboard: DashboardAttachmentData,
  before: DashboardAttachmentData | undefined
): AttachmentPanel | undefined => {
  if (typeof item === 'string') {
    return getLeafPanels(dashboard).find(({ id }) => id === item);
  }
  const seedIds = new Set(before ? getLeafPanels(before).map(({ id }) => id) : []);
  return getPanelContainers(dashboard)
    .flatMap(({ panels }) => [...panels].sort(byReadingOrder))
    .find((panel) => !seedIds.has(panel.id) && getPanelKind(panel) === item.added);
};

const checkPanelEdit = (
  { panel: item, type, config, color, bulletList, contentIncludes = [], vegaMark }: PanelEditGold,
  index: number,
  dashboard: DashboardAttachmentData,
  before: DashboardAttachmentData | undefined
): Check => {
  const assertion = `panelEdits[${index}]`;
  const panel = resolvePanel(item, dashboard, before);
  const id = panel?.id ?? (typeof item === 'string' ? item : `added ${item.added}`);
  if (!panel) {
    return { assertion, passed: false, detail: `${id} not found` };
  }
  const { mismatches } = matchConfig({ type, config }, toMatchedPanel(panel));
  const colors = getPanelColors(panel);
  const content = typeof panel.config.content === 'string' ? panel.config.content : '';

  const problems = compact([
    ...mismatches,
    color !== undefined && !colors.some((value) => matchesColorName(value, color))
      ? `colors [${colors.join(', ')}] have no ${color}`
      : undefined,
    bulletList && countBulletItems(content) < 2 ? 'no bullet list' : undefined,
    ...contentIncludes
      .filter((term) => !content.toLowerCase().includes(term.toLowerCase()))
      .map((term) => `content does not mention "${term}"`),
    vegaMark !== undefined && !getVegaMarkTypes(panel).includes(vegaMark)
      ? `spec draws no ${vegaMark} mark`
      : undefined,
  ]);

  return {
    assertion,
    passed: problems.length === 0,
    detail: `${id}: ${problems.length === 0 ? 'edited as asked' : problems.join('; ')}`,
  };
};

/**
 * Checks that a panel the prompt edits in place keeps its id, and that it, or a
 * panel the prompt adds, ends up as the gold describes it: the listed `type`
 * and `config` values, subset-matched as the visualization suite matches its
 * config gold, plus a requested color hue (in a Vega spec too), markdown
 * bullet list or terms, or Vega mark type. Whether the rest of the layout held is scored by Dashboard
 * Layout Edit.
 */
export const dashboardPanelEditsEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_PANEL_EDITS_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const gold = expected?.panelEdits;
    if (!gold || gold.length === 0) {
      return skippedResult('No panel edit gold.');
    }
    const { dashboard, before } = output;
    // Without a write the result is the seed itself, which has none of the requested edits.
    if (!dashboard || !hasWrittenDashboard(output)) {
      return noDashboardResult;
    }

    const checks = gold.map((edit, index) => checkPanelEdit(edit, index, dashboard, before));
    return scoreChecks(checks, { subject: 'panel edit', passLabel: 'match' });
  },
};
