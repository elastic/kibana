/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPanelQueries, isRecord } from '../dashboard_panels';
import { panelRule, type DashboardRule } from './rule_model';

/**
 * Per-panel chart rules from "Prettify — agent rules", checked on the Lens
 * Config API (ES|QL) config each panel stores. Paths name the config field.
 */
export type ChartRuleId =
  | 'summary_panel_titled'
  | 'chart_panel_untitled'
  | 'xy_axis_title'
  | 'area_solid_fill'
  | 'xy_legend'
  | 'pie_legend_set'
  | 'metric_colors_background'
  | 'legacy_palette'
  | 'static_color_override'
  | 'percent_format_on_0_100'
  | 'gauge_bands';

/** The label already names these, so a panel title only repeats it. */
const UNTITLED_KINDS = ['metric', 'gauge'];
/** Category labels do not name these, so they need "measure + breakdown" as the title. */
const TITLED_KINDS = [
  'xy',
  'heatmap',
  'region_map',
  'data_table',
  'pie',
  'treemap',
  'mosaic',
  'tag_cloud',
  'waffle',
];

const CHART_KINDS = [...UNTITLED_KINDS, ...TITLED_KINDS];
const LEGACY_PALETTES = new Set(['eui_amsterdam', 'kibana_v7_legacy', 'elastic_brand_2023']);
/** Kinds where the enhance rules strip series or slice color overrides. */
const DEFAULT_PALETTE_KINDS = ['xy', 'pie', 'heatmap', 'treemap', 'mosaic', 'waffle'];

interface ConfigNode {
  path: string;
  node: Record<string, unknown>;
}

/** Every object inside a panel config, with its JSON path. */
const walkConfig = (value: unknown, path = ''): ConfigNode[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => walkConfig(item, `${path}[${index}]`));
  }
  if (!isRecord(value)) {
    return [];
  }
  return [
    { path, node: value },
    ...Object.entries(value).flatMap(([key, child]) =>
      walkConfig(child, path ? `${path}.${key}` : key)
    ),
  ];
};

/** Xy layers whose static colors mark thresholds or events, not data series. */
const DECORATION_LAYER_TYPES = new Set(['reference_lines', 'annotations', 'annotation_group']);

const LAYER_PATH = /^layers\[(\d+)\]/;

/** True when `path` points inside a reference line or annotation layer of `config`. */
const isInDecorationLayer = (config: Record<string, unknown>, path: string): boolean => {
  const index = LAYER_PATH.exec(path)?.[1];
  const layer =
    index !== undefined && Array.isArray(config.layers) ? config.layers[Number(index)] : undefined;
  return (
    isRecord(layer) && typeof layer.type === 'string' && DECORATION_LAYER_TYPES.has(layer.type)
  );
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The expression assigned to `column`, up to the next `|` or a comma outside
 * parentheses, so `ROUND(a / b, 4) * 100` is read whole.
 */
const getAssignedExpression = (query: string, column: string): string | undefined => {
  const assignment = new RegExp(`(?:^|[\\s,|])\`?${escapeRegExp(column)}\`?\\s*=\\s*`, 'i');
  const match = assignment.exec(query);
  if (!match) {
    return undefined;
  }
  let depth = 0;
  let end = match.index + match[0].length;
  for (; end < query.length; end++) {
    const char = query[end];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === '|' || (char === ',' && depth === 0)) break;
  }
  return query.slice(match.index + match[0].length, end);
};

/** True when the ES|QL assigns `column` from an expression that multiplies by 100. */
const computesPercentAsHundreds = (queries: string[], column: string): boolean =>
  queries.some((query) =>
    /\b100(\.0*)?\s*\*|\*\s*100(\.0*)?\b/.test(getAssignedExpression(query, column) ?? '')
  );

const hasAreaLayer = (config: Record<string, unknown>): boolean =>
  Array.isArray(config.layers) &&
  config.layers.some(
    (layer) => isRecord(layer) && typeof layer.type === 'string' && layer.type.startsWith('area')
  );

const getTitle = (config: Record<string, unknown>): string =>
  typeof config.title === 'string' ? config.title.trim() : '';

export const CHART_RULES: Record<ChartRuleId, DashboardRule<ChartRuleId>> = {
  summary_panel_titled: panelRule('summary_panel_titled', {
    appliesTo: UNTITLED_KINDS,
    check: ({ config }) =>
      getTitle(config)
        ? { detail: `${String(config.type)} has panel title "${getTitle(config)}"`, path: 'title' }
        : undefined,
  }),
  chart_panel_untitled: panelRule('chart_panel_untitled', {
    appliesTo: TITLED_KINDS,
    check: ({ config }) =>
      getTitle(config)
        ? undefined
        : { detail: `${String(config.type)} has no panel title`, path: 'title' },
  }),
  xy_axis_title: panelRule('xy_axis_title', {
    appliesTo: ['xy'],
    check: ({ config }) => {
      const axis: Record<string, unknown> = isRecord(config.axis) ? config.axis : {};
      const axes = ['x', 'y', ...('y2' in axis ? ['y2'] : [])];
      // Lens shows an axis title unless `visible: false` hides it; `text` alone does not show it.
      const shown = axes.filter((name) => {
        const settings = axis[name];
        const title = isRecord(settings) ? settings.title : undefined;
        return !isRecord(title) || title.visible !== false;
      });
      return shown.length === 0
        ? undefined
        : { detail: `axis title shown on ${shown.join(', ')}`, path: `axis.${shown[0]}.title` };
    },
  }),
  area_solid_fill: panelRule('area_solid_fill', {
    appliesTo: ['xy'],
    check: ({ config }) => {
      if (!hasAreaLayer(config)) {
        return undefined;
      }
      const styling = isRecord(config.styling) ? config.styling : {};
      const areas = isRecord(styling.areas) ? styling.areas : {};
      return areas.fill === 'gradient'
        ? undefined
        : {
            detail: `area fill is ${String(areas.fill ?? 'solid (default)')}`,
            path: 'styling.areas.fill',
          };
    },
  }),
  xy_legend: panelRule('xy_legend', {
    appliesTo: ['xy'],
    check: ({ config }) => {
      const legend = isRecord(config.legend) ? config.legend : {};
      const problems = [
        legend.position !== 'bottom' &&
          `position is ${String(legend.position ?? 'right (default)')}`,
        legend.placement === 'inside' && 'placed inside the chart',
        // An unset visibility hides the legend entirely.
        legend.visibility === undefined && 'visibility is unset',
      ].filter((problem): problem is string => typeof problem === 'string');
      return problems.length === 0
        ? undefined
        : { detail: `legend ${problems.join(', ')}`, path: 'legend' };
    },
  }),
  pie_legend_set: panelRule('pie_legend_set', {
    appliesTo: ['pie'],
    check: ({ config }) =>
      'legend' in config
        ? { detail: 'pie sets a legend; Lens defaults should apply', path: 'legend' }
        : undefined,
  }),
  metric_colors_background: panelRule('metric_colors_background', {
    appliesTo: ['metric'],
    check: ({ config }) => {
      // `apply_color_to` and `color` live on each metric entry, not on the panel config.
      const metrics = Array.isArray(config.metrics) ? config.metrics : [];
      const background = metrics.findIndex(
        (metric) => isRecord(metric) && metric.apply_color_to === 'background'
      );
      if (background !== -1) {
        return {
          detail: 'metric colors the background',
          path: `metrics[${background}].apply_color_to`,
        };
      }
      // A stored config has `color` defaulted to `{ type: 'auto' }`, which is no color either.
      const uncolored = metrics.findIndex(
        (metric) =>
          isRecord(metric) &&
          metric.apply_color_to !== undefined &&
          (metric.color === undefined || (isRecord(metric.color) && metric.color.type === 'auto'))
      );
      return uncolored === -1
        ? undefined
        : {
            detail: 'apply_color_to set without a color, so Lens tints it green',
            path: `metrics[${uncolored}].apply_color_to`,
          };
    },
  }),
  legacy_palette: panelRule('legacy_palette', {
    appliesTo: CHART_KINDS,
    check: ({ config }) => {
      const found = walkConfig(config).find(
        ({ node }) => typeof node.palette === 'string' && LEGACY_PALETTES.has(node.palette)
      );
      return found
        ? {
            detail: `legacy palette ${String(found.node.palette)}`,
            path: found.path ? `${found.path}.palette` : 'palette',
          }
        : undefined;
    },
  }),
  static_color_override: panelRule('static_color_override', {
    appliesTo: DEFAULT_PALETTE_KINDS,
    check: ({ config }) => {
      const found = walkConfig(config)
        .filter(({ path }) => !isInDecorationLayer(config, path))
        .find(({ node }) => node.type === 'static' && 'color' in node);
      return found
        ? {
            detail: `static color ${String(found.node.color)} overrides the palette`,
            path: found.path,
          }
        : undefined;
    },
  }),
  percent_format_on_0_100: panelRule('percent_format_on_0_100', {
    appliesTo: CHART_KINDS,
    check: (panel) => {
      const queries = getPanelQueries(panel);
      const found = walkConfig(panel.config).find(({ node }) => {
        const { column, format } = node;
        return (
          typeof column === 'string' &&
          isRecord(format) &&
          format.type === 'percent' &&
          computesPercentAsHundreds(queries, column)
        );
      });
      return found
        ? {
            detail: `percent format on "${String(
              found.node.column
            )}", which is already 0–100; Lens multiplies by 100 again`,
            path: `${found.path}.format`,
          }
        : undefined;
    },
  }),
  gauge_bands: panelRule('gauge_bands', {
    appliesTo: ['gauge'],
    strictness: 'should',
    check: ({ config }) => {
      // Gauge bands are the metric's color, not a panel-level setting.
      const color = isRecord(config.metric) ? config.metric.color : undefined;
      if (!isRecord(color) || color.type !== 'dynamic') {
        return undefined;
      }
      const steps = Array.isArray(color.steps) ? color.steps.length : 0;
      return color.range === 'percentage' && steps === 4
        ? undefined
        : {
            detail: `gauge bands are ${steps} ${String(
              color.range
            )} steps; default is 4 percentage bands`,
            path: 'metric.color',
          };
    },
  }),
};
