/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptiveLens, AdaptivePartitionChart } from '../../model/adaptive_lens';
import type { AdaptiveQuery } from '../../model/adaptive_query';

import type { DiagnosticBag } from './diagnostics';
import { formatFromLensColumn, type LensColumnFormat } from './format_resolver';
import type { FormBasedLayer, LensState, PartitionVisualizationState } from './types';

interface BuildPartitionArgs {
  panelId: string;
  title: string;
  subtitle?: string;
  state: LensState;
  visualization: PartitionVisualizationState;
  query: AdaptiveQuery;
  diagnostics: DiagnosticBag;
  fieldFormats?: Record<string, LensColumnFormat>;
  provenance?: AdaptiveLens['provenance'];
}

export const buildPartitionLens = ({
  panelId,
  title,
  subtitle,
  state,
  visualization,
  query,
  diagnostics,
  fieldFormats,
  provenance,
}: BuildPartitionArgs): AdaptiveLens | undefined => {
  const layer = visualization.layers[0];
  if (!layer) {
    diagnostics.push({
      level: 'error',
      code: 'lens.partition.no-layer',
      message: 'partition visualization has no layers',
    });
    return undefined;
  }

  // Partition charts use `primaryGroups[0]` as the slice label and either
  // `metric` or `metrics[0]` as the slice value.
  const labelAccessor = layer.primaryGroups[0];
  const valueAccessor = layer.metric ?? layer.metrics?.[0];
  if (!labelAccessor || !valueAccessor) {
    diagnostics.push({
      level: 'error',
      code: 'lens.partition.missing-accessors',
      message: 'partition layer must have at least one primary group and one metric',
    });
    return undefined;
  }

  if (layer.primaryGroups.length > 1) {
    diagnostics.push({
      level: 'info',
      code: 'lens.partition.multi-group-flattened',
      message: 'partition uses multiple primary groups; Adaptive UI flattens to the first',
    });
  }

  const formBasedLayer = firstFormBasedLayerById(state, layer.layerId);
  const labelColumn = formBasedLayer?.columns[labelAccessor];
  const valueColumn = formBasedLayer?.columns[valueAccessor];

  const shape = visualization.shape ?? 'donut';
  let layout: AdaptivePartitionChart['layout'];
  switch (shape) {
    case 'donut':
    case 'pie':
    case 'treemap':
    case 'mosaic':
    case 'waffle':
      layout = shape;
      break;
    default:
      layout = 'donut';
  }

  // Resolve Lens's per-slice number toggle. `numberDisplay` is the modern
  // saved-object field; `valuesInLegend` is the older toggle. When neither
  // is set we fall back to `'both'` so legends still read like the Lens
  // pre-2022 default (value + percent).
  const valueDisplay = resolveValueDisplay(visualization);
  const labelPosition = resolveLabelPosition(visualization);
  const colors = resolvePaletteColors(visualization);
  const colorMapping = resolveColorMapping(visualization.colorMapping, colors);
  if (Object.keys(colorMapping).length > 0) {
    diagnostics.push({
      level: 'info',
      code: 'lens.partition.color-mapping-preserved',
      message: `preserved ${Object.keys(colorMapping).length} Lens category color assignment(s)`,
    });
  }

  const chart: AdaptivePartitionChart = {
    kind: 'partition',
    layout,
    slices: {
      id: labelAccessor,
      valueField: valueAccessor,
      label: valueColumn?.label ?? labelColumn?.label ?? title,
    },
    ...(valueDisplay ? { valueDisplay } : {}),
    ...(labelPosition ? { labelPosition } : {}),
    ...(colors.length > 0 ? { colors } : {}),
    ...(Object.keys(colorMapping).length > 0 ? { colorMapping } : {}),
  };

  const format = formatFromLensColumn(valueColumn, fieldFormats);

  return {
    id: panelId,
    title,
    ...(subtitle ? { subtitle } : {}),
    chart,
    query,
    ...(format ? { format } : {}),
    ...(provenance ? { provenance } : {}),
  };
};

const resolveLabelPosition = (
  visualization: PartitionVisualizationState
): AdaptivePartitionChart['labelPosition'] | undefined => {
  switch (visualization.labels?.position) {
    case 'inside':
      return 'inside';
    case 'outside':
      return 'outside';
    default:
      return undefined;
  }
};

const resolvePaletteColors = (visualization: PartitionVisualizationState): string[] => {
  const params = visualization.palette?.params;
  const explicit = params?.colors?.filter(
    (color): color is string => typeof color === 'string' && color.length > 0
  );
  if (explicit && explicit.length > 0) {
    return explicit;
  }
  return (
    params?.stops
      ?.map((stop) => stop.color)
      .filter((color): color is string => typeof color === 'string' && color.length > 0) ?? []
  );
};

const resolveColorMapping = (
  input: unknown,
  paletteColors: readonly string[]
): Record<string, string> => {
  const mapping: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return mapping;
  }

  // Legacy/simple color mapping shape: { "Term": "#54B399" }.
  if (!Array.isArray(input)) {
    for (const [key, value] of Object.entries(input)) {
      if (isColorString(value)) {
        mapping[key] = value;
      }
    }
  }

  for (const assignment of collectAssignmentObjects(input)) {
    const color = extractColor(assignment, paletteColors);
    if (!color) {
      continue;
    }
    for (const label of extractAssignmentLabels(assignment)) {
      mapping[label] = color;
    }
  }

  return mapping;
};

const collectAssignmentObjects = (input: unknown): Record<string, unknown>[] => {
  if (Array.isArray(input)) {
    return input.flatMap(collectAssignmentObjects);
  }
  if (!input || typeof input !== 'object') {
    return [];
  }
  const object = input as Record<string, unknown>;
  const out: Record<string, unknown>[] = [];
  if (extractColor(object, [])) {
    out.push(object);
  }
  for (const key of ['assignments', 'specialAssignments']) {
    const value = object[key];
    if (Array.isArray(value)) {
      out.push(...value.flatMap(collectAssignmentObjects));
    }
  }
  return out;
};

const extractColor = (input: unknown, paletteColors: readonly string[]): string | undefined => {
  if (isColorString(input)) {
    return input;
  }
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const object = input as Record<string, unknown>;
  const paletteIndexed = extractPaletteIndexedColor(object, paletteColors);
  if (paletteIndexed) {
    return paletteIndexed;
  }
  for (const key of ['colorCode', 'color', 'hex', 'value']) {
    const value = object[key];
    if (isColorString(value)) {
      return value;
    }
    if (value && typeof value === 'object') {
      const nested = extractColor(value, paletteColors);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
};

const extractPaletteIndexedColor = (
  input: Record<string, unknown>,
  paletteColors: readonly string[]
): string | undefined => {
  const explicitIndex = firstNumber(input.colorIndex, input.paletteIndex, input.paletteColorIndex);
  const genericIndex = isPaletteDescriptor(input) ? firstNumber(input.index) : undefined;
  const index = explicitIndex ?? genericIndex;
  if (index === undefined) {
    return undefined;
  }
  const palette = paletteColors.length > 0 ? paletteColors : DEFAULT_PALETTE;
  return palette[index % palette.length];
};

const isPaletteDescriptor = (input: Record<string, unknown>): boolean => {
  if (typeof input.paletteId === 'string') {
    return true;
  }
  if (typeof input.type !== 'string') {
    return false;
  }
  const type = input.type.toLowerCase();
  return type.includes('palette') || type.includes('categorical');
};

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const parsed =
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return undefined;
};

const extractAssignmentLabels = (assignment: Record<string, unknown>): string[] => {
  const labels = new Set<string>();
  for (const key of ['rules', 'rule', 'values', 'terms', 'keys', 'categories']) {
    collectLabels(assignment[key], labels);
  }
  return Array.from(labels);
};

const collectLabels = (input: unknown, labels: Set<string>): void => {
  if (Array.isArray(input)) {
    input.forEach((item) => collectLabels(item, labels));
    return;
  }
  if (typeof input === 'string' || typeof input === 'number') {
    const value = String(input);
    if (value.length > 0 && !isColorString(value)) {
      labels.add(value);
    }
    return;
  }
  if (!input || typeof input !== 'object') {
    return;
  }
  const object = input as Record<string, unknown>;
  for (const key of ['values', 'terms', 'keys', 'categories', 'labels']) {
    collectLabels(object[key], labels);
  }
  for (const key of ['value', 'key', 'label']) {
    const value = object[key];
    if (typeof value === 'string' || typeof value === 'number') {
      collectLabels(value, labels);
    }
  }
};

const isColorString = (value: unknown): value is string =>
  typeof value === 'string' &&
  (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(value) ||
    /^rgba?\(/iu.test(value) ||
    /^hsla?\(/iu.test(value));

const DEFAULT_PALETTE: readonly string[] = [
  '#54B399',
  '#6092C0',
  '#D36086',
  '#9170B8',
  '#CA8EAE',
  '#D6BF57',
  '#B9A888',
  '#DA8B45',
  '#AA6556',
  '#E7664C',
];

const firstFormBasedLayerById = (state: LensState, layerId: string): FormBasedLayer | undefined => {
  const layers =
    state.datasourceStates?.formBased?.layers ?? state.datasourceStates?.indexpattern?.layers;
  return layers?.[layerId];
};

const resolveValueDisplay = (
  visualization: PartitionVisualizationState
): AdaptivePartitionChart['valueDisplay'] => {
  switch (visualization.numberDisplay) {
    case 'hidden':
      return 'hidden';
    case 'value':
      return 'value';
    case 'percent':
      return 'percent';
    case undefined:
      // Older saved objects rely on the `valuesInLegend` toggle alone: when
      // the author hid values we collapse to percent-only so the legend
      // still carries some quantitative cue. When the field is missing we
      // leave `undefined` so the primitive's `'both'` default applies and
      // the bind step doesn't have to encode the same fallback.
      return visualization.valuesInLegend === false ? 'percent' : undefined;
    default:
      return undefined;
  }
};
