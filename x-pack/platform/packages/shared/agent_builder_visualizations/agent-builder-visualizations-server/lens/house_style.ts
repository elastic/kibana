/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { isRecord } from './is_record';

const DEFAULT_CATEGORICAL_COLOR_MAPPING = {
  mode: 'categorical',
  palette: 'default',
  mapping: [],
} as const;

export const HOUSE_STYLE_PRESERVE = [
  'panel_title',
  'axis_titles',
  'legend_position',
  'legend_visibility',
  'area_fill',
  'series_colors',
  'metric_color',
  'table_cell_colors',
] as const;

export type HouseStylePreserve = (typeof HOUSE_STYLE_PRESERVE)[number];

export type HouseStyleMode = 'new' | 'edit' | 'normalize';
export type HouseStyleRules = 'defects' | 'all';
export type HouseStyleColors = 'keep' | 'reset';

export interface HouseStyleOptions {
  chartType: SupportedChartType;
  mode: HouseStyleMode;
  rules: HouseStyleRules;
  colors: HouseStyleColors;
  preserve?: readonly HouseStylePreserve[];
}

export interface HouseStyleChange {
  id: string;
  detail?: string;
}

export interface HouseStyleResult {
  config: Record<string, unknown>;
  panelLevel: { hide_title?: boolean };
  changes: HouseStyleChange[];
}

const TITLELESS_CHARTS = new Set<string>([
  SupportedChartType.Metric,
  SupportedChartType.Gauge,
  SupportedChartType.Tagcloud,
  SupportedChartType.Waffle,
]);

const LEGACY_PALETTES = new Set([
  'eui_amsterdam',
  'kibana_v7_legacy',
  'elastic_brand_2023',
  'behind_text',
]);

const isLegacyPalette = (palette: string): boolean =>
  LEGACY_PALETTES.has(palette) || palette.startsWith('LEGACY_PALETTE_');

const cloneConfig = (config: Record<string, unknown>): Record<string, unknown> =>
  structuredClone(config);

const asRecordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const getLayers = (config: Record<string, unknown>): Record<string, unknown>[] =>
  asRecordArray(config.layers);

const getXyYValues = (config: Record<string, unknown>): Record<string, unknown>[] =>
  getLayers(config).flatMap((layer) => asRecordArray(layer.y));

const getPrimaryMetric = (config: Record<string, unknown>): Record<string, unknown> | undefined => {
  const metrics = asRecordArray(config.metrics);
  const typedPrimary = metrics.find((metric) => metric.type === 'primary');
  return typedPrimary ?? metrics[0];
};

const legendHasStatistics = (legend: Record<string, unknown>): boolean =>
  Array.isArray(legend.statistics) && legend.statistics.length > 0;

const xySeriesCount = (config: Record<string, unknown>): number => getXyYValues(config).length;

const hasBreakdown = (config: Record<string, unknown>): boolean => {
  if (isRecord(config.breakdown_by)) {
    return true;
  }
  return getLayers(config).some((layer) => isRecord(layer.breakdown_by));
};

const isAreaLayer = (layer: Record<string, unknown>): boolean =>
  typeof layer.type === 'string' && layer.type.startsWith('area');

const allLayersAreLine = (config: Record<string, unknown>): boolean => {
  const layers = getLayers(config);
  return layers.length > 0 && layers.every((layer) => layer.type === 'line');
};

const replaceLegacyPalette = (value: unknown, lineOptimized: boolean): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => replaceLegacyPalette(entry, lineOptimized));
  }
  if (!isRecord(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'palette' && typeof child === 'string' && isLegacyPalette(child)) {
      next.palette = lineOptimized ? 'elastic_line_optimized' : 'default';
      continue;
    }
    next[key] = replaceLegacyPalette(child, lineOptimized);
  }
  return next;
};

const colorEqualsDefaultCategorical = (color: unknown): boolean =>
  JSON.stringify(color) === JSON.stringify(DEFAULT_CATEGORICAL_COLOR_MAPPING);

const resetColorValue = (color: unknown): unknown => {
  if (!isRecord(color)) {
    return { type: 'auto' };
  }
  if (color.type === 'static') {
    return { type: 'auto' };
  }
  if (colorEqualsDefaultCategorical(color)) {
    return color;
  }
  if (color.mode === 'categorical' || color.palette !== undefined) {
    return { ...DEFAULT_CATEGORICAL_COLOR_MAPPING };
  }
  if (color.type === 'static') {
    return { type: 'auto' };
  }
  return { type: 'auto' };
};

interface RuleContext {
  config: Record<string, unknown>;
  chartType: SupportedChartType;
  panelLevel: { hide_title?: boolean };
  changes: HouseStyleChange[];
  preserve: ReadonlySet<HouseStylePreserve>;
}

interface HouseStyleRule {
  id: string;
  applies: (chartType: SupportedChartType) => boolean;
  tier: 'defects' | 'all' | 'reset';
  modes: readonly HouseStyleMode[];
  preserve?: HouseStylePreserve;
  apply: (ctx: RuleContext) => void;
}

const recordChange = (ctx: RuleContext, id: string, detail?: string): void => {
  ctx.changes.push(detail === undefined ? { id } : { id, detail });
};

const RULES: readonly HouseStyleRule[] = [
  {
    id: 'T1',
    applies: (chartType) => TITLELESS_CHARTS.has(chartType),
    tier: 'defects',
    modes: ['new', 'edit', 'normalize'],
    preserve: 'panel_title',
    apply: (ctx) => {
      if (isRecord(ctx.config.breakdown_by)) {
        return;
      }
      const title = typeof ctx.config.title === 'string' ? ctx.config.title.trim() : '';
      if (
        title.length === 0 ||
        ctx.config.hide_title === true ||
        ctx.panelLevel.hide_title === true
      ) {
        return;
      }
      if (ctx.chartType === SupportedChartType.Metric) {
        const primary = getPrimaryMetric(ctx.config);
        if (primary && typeof primary.label !== 'string') {
          primary.label = title;
        }
      }
      ctx.panelLevel.hide_title = true;
      recordChange(ctx, 'T1');
    },
  },
  {
    id: 'M2',
    applies: (chartType) => chartType === SupportedChartType.Metric,
    tier: 'defects',
    modes: ['new', 'edit', 'normalize'],
    preserve: 'metric_color',
    apply: (ctx) => {
      const primary = getPrimaryMetric(ctx.config);
      if (!primary) {
        return;
      }
      const color = isRecord(primary.color) ? primary.color : undefined;
      const applyTo = primary.apply_color_to;
      if (applyTo === 'background' && color?.type === 'auto') {
        return;
      }
      const isStatic = color?.type === 'static';
      const hasNonDynamicApplyTo = applyTo !== undefined && color?.type !== 'dynamic';
      if (!isStatic && !hasNonDynamicApplyTo) {
        return;
      }
      primary.color = { type: 'auto' };
      delete primary.apply_color_to;
      recordChange(ctx, 'M2');
    },
  },
  {
    id: 'X0',
    applies: (chartType) => chartType === SupportedChartType.XY,
    tier: 'defects',
    modes: ['new', 'edit', 'normalize'],
    apply: (ctx) => {
      const legend = isRecord(ctx.config.legend) ? ctx.config.legend : {};
      if (legend.visibility !== undefined) {
        return;
      }
      ctx.config.legend = {
        ...legend,
        visibility: legendHasStatistics(legend) ? 'visible' : 'auto',
      };
      recordChange(ctx, 'X0');
    },
  },
  {
    id: 'X1',
    applies: (chartType) => chartType === SupportedChartType.XY,
    tier: 'defects',
    modes: ['new', 'edit', 'normalize'],
    preserve: 'area_fill',
    apply: (ctx) => {
      if (!getLayers(ctx.config).some(isAreaLayer)) {
        return;
      }
      const styling = isRecord(ctx.config.styling) ? ctx.config.styling : {};
      const areas = isRecord(styling.areas) ? styling.areas : {};
      if (areas.fill === 'gradient') {
        return;
      }
      ctx.config.styling = {
        ...styling,
        areas: { ...areas, fill: 'gradient' },
      };
      recordChange(ctx, 'X1');
    },
  },
  {
    id: 'X2',
    applies: (chartType) => chartType === SupportedChartType.XY,
    tier: 'defects',
    modes: ['new', 'edit', 'normalize'],
    preserve: 'legend_visibility',
    apply: (ctx) => {
      const legend = isRecord(ctx.config.legend) ? ctx.config.legend : undefined;
      if (!legend || legend.visibility !== 'visible') {
        return;
      }
      if (
        legendHasStatistics(legend) ||
        hasBreakdown(ctx.config) ||
        xySeriesCount(ctx.config) !== 1
      ) {
        return;
      }
      ctx.config.legend = { ...legend, visibility: 'auto' };
      recordChange(ctx, 'X2');
    },
  },
  {
    id: 'X8',
    applies: () => true,
    tier: 'defects',
    modes: ['new', 'edit', 'normalize'],
    apply: (ctx) => {
      const next = replaceLegacyPalette(ctx.config, allLayersAreLine(ctx.config));
      if (!isRecord(next) || JSON.stringify(next) === JSON.stringify(ctx.config)) {
        return;
      }
      Object.keys(ctx.config).forEach((key) => {
        delete ctx.config[key];
      });
      Object.assign(ctx.config, next);
      recordChange(ctx, 'X8');
    },
  },
  {
    id: 'D1',
    applies: (chartType) => chartType === SupportedChartType.Datatable,
    tier: 'defects',
    modes: ['new', 'edit', 'normalize'],
    preserve: 'table_cell_colors',
    apply: (ctx) => {
      let changed = false;
      const retarget = (entries: Record<string, unknown>[]): void => {
        for (const entry of entries) {
          if (entry.apply_color_to === 'value' || entry.apply_color_to === 'background') {
            entry.apply_color_to = 'badge';
            changed = true;
          }
        }
      };
      retarget(asRecordArray(ctx.config.metrics));
      retarget(asRecordArray(ctx.config.rows));
      if (changed) {
        recordChange(ctx, 'D1');
      }
    },
  },
  {
    id: 'X4',
    applies: (chartType) =>
      chartType === SupportedChartType.XY || chartType === SupportedChartType.Heatmap,
    tier: 'all',
    modes: ['new', 'normalize'],
    preserve: 'axis_titles',
    apply: (ctx) => {
      if (ctx.config.axis === undefined) {
        return;
      }
      const axis = isRecord(ctx.config.axis) ? ctx.config.axis : undefined;
      if (!axis) {
        return;
      }
      const hideTitle = (key: 'x' | 'y' | 'y2'): void => {
        const side = axis[key];
        if (!isRecord(side)) {
          return;
        }
        const title = isRecord(side.title) ? side.title : {};
        if (title.visible === false) {
          return;
        }
        const dropped = typeof title.text === 'string' ? title.text : undefined;
        side.title = { visible: false };
        recordChange(ctx, 'X4', dropped);
      };
      hideTitle('x');
      hideTitle('y');
      hideTitle('y2');
    },
  },
  {
    id: 'X5',
    applies: (chartType) => chartType === SupportedChartType.XY,
    tier: 'all',
    modes: ['new', 'normalize'],
    preserve: 'legend_position',
    apply: (ctx) => {
      const legend = isRecord(ctx.config.legend) ? { ...ctx.config.legend } : {};
      const alreadyOutsideBottom = legend.placement === 'outside' && legend.position === 'bottom';
      if (alreadyOutsideBottom && legend.size === undefined && legend.columns === undefined) {
        return;
      }
      delete legend.size;
      delete legend.columns;
      legend.placement = 'outside';
      legend.position = 'bottom';
      if (legendHasStatistics(legend)) {
        legend.visibility = 'visible';
      }
      ctx.config.legend = legend;
      recordChange(ctx, 'X5');
    },
  },
  {
    id: 'C-reset',
    applies: () => true,
    tier: 'reset',
    modes: ['normalize'],
    preserve: 'series_colors',
    apply: (ctx) => {
      let changed = false;
      const resetIfCustom = (holder: Record<string, unknown>, key: string): void => {
        if (holder[key] === undefined) {
          return;
        }
        const next = resetColorValue(holder[key]);
        if (JSON.stringify(next) !== JSON.stringify(holder[key])) {
          holder[key] = next;
          changed = true;
        }
      };
      for (const y of getXyYValues(ctx.config)) {
        if (isRecord(y.color) && y.color.type === 'static') {
          y.color = { type: 'auto' };
          changed = true;
        }
      }
      for (const layer of getLayers(ctx.config)) {
        if (isRecord(layer.breakdown_by)) {
          resetIfCustom(layer.breakdown_by, 'color');
        }
      }
      if (isRecord(ctx.config.breakdown_by)) {
        resetIfCustom(ctx.config.breakdown_by, 'color');
      }
      if (isRecord(ctx.config.tag_by)) {
        resetIfCustom(ctx.config.tag_by, 'color');
      }
      for (const group of asRecordArray(ctx.config.group_by)) {
        resetIfCustom(group, 'color');
      }
      for (const row of asRecordArray(ctx.config.rows)) {
        resetIfCustom(row, 'color');
      }
      const primary = getPrimaryMetric(ctx.config);
      if (primary && isRecord(primary.color) && primary.color.type === 'static') {
        primary.color = { type: 'auto' };
        changed = true;
      }
      if (changed) {
        recordChange(ctx, 'C-reset');
      }
    },
  },
];

const ruleIsActive = (
  rule: HouseStyleRule,
  options: HouseStyleOptions,
  preserve: ReadonlySet<HouseStylePreserve>
): boolean => {
  if (!rule.applies(options.chartType)) {
    return false;
  }
  if (!rule.modes.includes(options.mode)) {
    return false;
  }
  if (rule.preserve && preserve.has(rule.preserve)) {
    return false;
  }
  if (rule.tier === 'reset') {
    return options.colors === 'reset';
  }
  if (rule.tier === 'all') {
    if (options.mode === 'new') {
      return true;
    }
    return options.mode === 'normalize' && options.rules === 'all';
  }
  return true;
};

export const applyHouseStyle = (
  config: Record<string, unknown>,
  options: HouseStyleOptions
): HouseStyleResult => {
  const next = cloneConfig(config);
  const preserve = new Set(options.preserve ?? []);
  const ctx: RuleContext = {
    config: next,
    chartType: options.chartType,
    panelLevel: {},
    changes: [],
    preserve,
  };

  for (const rule of RULES) {
    if (ruleIsActive(rule, options, preserve)) {
      rule.apply(ctx);
    }
  }

  return {
    config: ctx.config,
    panelLevel: ctx.panelLevel,
    changes: ctx.changes,
  };
};
