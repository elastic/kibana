/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import {
  GRID_COLUMNS,
  TIME_SLIDER_CONTROL,
  byReadingOrder,
  getControlFields,
  getControls,
  getLeafPanels,
  getPanelContainers,
  getPanelKind,
  getPanelQueries,
  getPanelQueryKey,
  getSectionTitles,
  isChartPanel,
  isSummaryPanel,
  withoutKeyword,
} from '../dashboard_panels';
import { CHART_RULES, type ChartRuleId } from './chart_rules';
import {
  panelRule,
  type DashboardRule,
  type RuleScope,
  type RuleStrictness,
  type RuleTarget,
  type RuleViolation,
} from './rule_model';

/**
 * Deterministic dashboard rules from the skill's layout and composition
 * guidance ("Prettify — agent rules"). Each rule reports the panels that break
 * it. Generated dashboards are scored against the rule groups below; the
 * seeded enhance fixture declares its defects as rule ids, and enhance is
 * scored on which of them the result no longer shows.
 */
export type DashboardRuleId =
  | ChartRuleId
  | 'out_of_bounds'
  | 'overlapping_panels'
  | 'full_width_kpi'
  | 'size_by_kind'
  | 'width_divides_48'
  | 'summary_not_first'
  | 'too_many_controls'
  | 'multiple_time_sliders'
  | 'high_cardinality_control'
  | 'placeholder_title'
  | 'no_sections'
  | 'duplicate_measure'
  | 'no_controls';

export type DashboardRuleViolation = RuleViolation<DashboardRuleId>;

/** "Prefer sections for … roughly 6 or more visualization panels". */
const SECTION_THRESHOLD = 6;
const PLACEHOLDER_TITLES = new Set([
  '',
  'untitled',
  'untitled dashboard',
  'new dashboard',
  'my dashboard',
  'a dashboard',
  'dashboard',
]);

/** Lower-cased title without a trailing copy number, so "Untitled dashboard 2" is still a placeholder. */
const withoutCopyNumber = (title: string): string => {
  const words = title.trim().toLowerCase().split(' ').filter(Boolean);
  const last = words.at(-1);
  const hasCopyNumber = words.length > 1 && last !== undefined && Number.isInteger(Number(last));
  return (hasCopyNumber ? words.slice(0, -1) : words).join(' ');
};

interface DefaultSize {
  /** Allowed widths, or an inclusive range when the guidance gives one ("24–48"). */
  widths: number[] | { min: number; max: number };
  minH: number;
  maxH: number;
}

/** Default sizes from the layout guidance, per panel kind. */
const DEFAULT_SIZES: Record<string, DefaultSize> = {
  metric: { widths: [6, 8, 12], minH: 5, maxH: 6 },
  gauge: { widths: [12], minH: 8, maxH: 8 },
  xy: { widths: [24, 48], minH: 10, maxH: 10 },
  heatmap: { widths: [24], minH: 10, maxH: 10 },
  tag_cloud: { widths: [24], minH: 10, maxH: 10 },
  treemap: { widths: [24], minH: 10, maxH: 10 },
  waffle: { widths: [24], minH: 10, maxH: 10 },
  mosaic: { widths: [24], minH: 10, maxH: 10 },
  pie: { widths: [12], minH: 10, maxH: 10 },
  markdown: { widths: { min: 24, max: 48 }, minH: 4, maxH: 9 },
  data_table: { widths: { min: 24, max: 48 }, minH: 12, maxH: 16 },
};

const fitsWidth = (widths: DefaultSize['widths'], w: number): boolean =>
  Array.isArray(widths) ? widths.includes(w) : w >= widths.min && w <= widths.max;

const describeWidths = (widths: DefaultSize['widths']): string =>
  Array.isArray(widths) ? widths.join('/') : `${widths.min}–${widths.max}`;

const MAX_CONTROLS = 5;
const HIGH_CARDINALITY_FIELD = /(^|[._])(id|uuid|guid)$/i;

const overlaps = (a: AttachmentPanel, b: AttachmentPanel): boolean =>
  a.grid.x < b.grid.x + b.grid.w &&
  b.grid.x < a.grid.x + a.grid.w &&
  a.grid.y < b.grid.y + b.grid.h &&
  b.grid.y < a.grid.y + a.grid.h;

/**
 * A rule that checks the dashboard as a whole. With a panel `appliesTo` its
 * violations name the panels involved, which are scored like panel rules, so
 * `appliesTo` must match the panels `check` inspects.
 */
const dashboardRule = (
  scope: RuleScope,
  check: DashboardRule<DashboardRuleId>['check'],
  {
    strictness = 'must',
    appliesTo = 'dashboard',
  }: { strictness?: RuleStrictness; appliesTo?: RuleTarget } = {}
): DashboardRule<DashboardRuleId> => ({
  scope,
  strictness,
  appliesTo,
  check,
});

const DASHBOARD_RULES: Record<DashboardRuleId, DashboardRule<DashboardRuleId>> = {
  ...CHART_RULES,
  out_of_bounds: panelRule('out_of_bounds', {
    appliesTo: 'all',
    check: ({ grid }) =>
      grid.x < 0 || grid.x + grid.w > GRID_COLUMNS
        ? { detail: `x=${grid.x} w=${grid.w} exceeds ${GRID_COLUMNS} columns`, path: 'grid' }
        : undefined,
  }),
  overlapping_panels: dashboardRule(
    'appearance',
    (dashboard) =>
      getPanelContainers(dashboard).flatMap(({ panels }) =>
        panels.flatMap((panel, index) =>
          panels
            .slice(index + 1)
            .filter((other) => overlaps(panel, other))
            .map((other) => ({
              rule: 'overlapping_panels' as const,
              panelIds: [panel.id, other.id],
              detail: `${panel.id} and ${other.id} overlap`,
            }))
        )
      ),
    { appliesTo: 'all' }
  ),
  full_width_kpi: panelRule('full_width_kpi', {
    appliesTo: ['metric', 'gauge'],
    check: (panel) =>
      panel.grid.w >= GRID_COLUMNS
        ? { detail: `${getPanelKind(panel)} spans the full width`, path: 'grid.w' }
        : undefined,
  }),
  size_by_kind: panelRule('size_by_kind', {
    appliesTo: Object.keys(DEFAULT_SIZES),
    strictness: 'should',
    check: (panel) => {
      const { widths, minH, maxH } = DEFAULT_SIZES[getPanelKind(panel)];
      const { w, h } = panel.grid;
      return fitsWidth(widths, w) && h >= minH && h <= maxH
        ? undefined
        : {
            detail: `${getPanelKind(panel)} is ${w}x${h}; default is w ${describeWidths(
              widths
            )}, h ${minH}–${maxH}`,
            path: 'grid',
          };
    },
  }),
  width_divides_48: panelRule('width_divides_48', {
    appliesTo: 'all',
    strictness: 'should',
    check: ({ grid }) =>
      grid.w > 0 && GRID_COLUMNS % grid.w === 0
        ? undefined
        : { detail: `w=${grid.w} does not divide 48 evenly`, path: 'grid.w' },
  }),
  summary_not_first: dashboardRule(
    'appearance',
    (dashboard) =>
      getPanelContainers(dashboard).flatMap(({ sectionTitle, panels }) => {
        const charts = panels.filter(isChartPanel).sort(byReadingOrder);
        const firstDetailIndex = charts.findIndex((panel) => !isSummaryPanel(panel));
        const late =
          firstDetailIndex === -1
            ? []
            : charts.slice(firstDetailIndex).filter((panel) => isSummaryPanel(panel));
        return late.length === 0
          ? []
          : [
              {
                rule: 'summary_not_first' as const,
                panelIds: late.map(({ id }) => id),
                detail: `${late.length} metric/gauge panel(s) placed after other charts in ${
                  sectionTitle === undefined ? 'the top level' : `section "${sectionTitle}"`
                }`,
              },
            ];
      }),
    { appliesTo: 'charts' }
  ),
  placeholder_title: dashboardRule('appearance', ({ title }) =>
    PLACEHOLDER_TITLES.has(withoutCopyNumber(title))
      ? [{ rule: 'placeholder_title', panelIds: [], detail: `title "${title}" is a placeholder` }]
      : []
  ),
  no_sections: dashboardRule(
    'appearance',
    (dashboard) => {
      const charts = getLeafPanels(dashboard).filter(isChartPanel);
      return charts.length >= SECTION_THRESHOLD && getSectionTitles(dashboard).length === 0
        ? [{ rule: 'no_sections', panelIds: [], detail: `${charts.length} charts and no sections` }]
        : [];
    },
    { strictness: 'should' }
  ),
  duplicate_measure: dashboardRule(
    'content',
    // Each group keeps the panel whose id sorts first, so moving panels
    // around does not change which copy is flagged.
    (dashboard) => {
      const panelIdsByQueries = new Map<string, string[]>();
      for (const panel of getLeafPanels(dashboard)) {
        const queries = getPanelQueries(panel);
        if (queries.length > 0) {
          const key = getPanelQueryKey(queries);
          panelIdsByQueries.set(key, [...(panelIdsByQueries.get(key) ?? []), panel.id]);
        }
      }
      return [...panelIdsByQueries.values()].flatMap((panelIds) => {
        const [original, ...copies] = [...panelIds].sort();
        return copies.map((id) => ({
          rule: 'duplicate_measure' as const,
          panelIds: [id],
          detail: `${id} runs the same ES|QL as ${original}`,
        }));
      });
    },
    { appliesTo: 'all' }
  ),
  too_many_controls: dashboardRule('content', (dashboard) => {
    const count = getControls(dashboard).filter(({ type }) => type !== TIME_SLIDER_CONTROL).length;
    return count > MAX_CONTROLS
      ? [
          {
            rule: 'too_many_controls',
            panelIds: [],
            detail: `${count} controls; at most ${MAX_CONTROLS}`,
          },
        ]
      : [];
  }),
  multiple_time_sliders: dashboardRule('content', (dashboard) => {
    const count = getControls(dashboard).filter(({ type }) => type === TIME_SLIDER_CONTROL).length;
    return count > 1
      ? [
          {
            rule: 'multiple_time_sliders',
            panelIds: [],
            detail: `${count} time sliders; at most 1`,
          },
        ]
      : [];
  }),
  high_cardinality_control: dashboardRule('content', (dashboard) => {
    // Text fields are stored as their `.keyword` sibling, so test the base name.
    const fields = getControls(dashboard)
      .flatMap(getControlFields)
      .filter((field) => HIGH_CARDINALITY_FIELD.test(withoutKeyword(field)));
    return fields.length > 0
      ? [
          {
            rule: 'high_cardinality_control',
            panelIds: [],
            detail: `controls on high-cardinality ids: ${fields.join(', ')}`,
          },
        ]
      : [];
  }),
  no_controls: dashboardRule('content', ({ pinned_panels: controls = [] }) =>
    controls.length === 0
      ? [{ rule: 'no_controls', panelIds: [], detail: 'dashboard has no controls' }]
      : []
  ),
};

export const LAYOUT_RULES: readonly DashboardRuleId[] = [
  'out_of_bounds',
  'overlapping_panels',
  'full_width_kpi',
  'size_by_kind',
  'width_divides_48',
];
export const COMPOSITION_RULES: readonly DashboardRuleId[] = ['summary_not_first', 'no_sections'];
export const CONTROL_RULES: readonly DashboardRuleId[] = [
  'too_many_controls',
  'multiple_time_sliders',
  'high_cardinality_control',
];
export const TITLE_RULES: readonly DashboardRuleId[] = [
  'placeholder_title',
  'summary_panel_titled',
  'chart_panel_untitled',
  'xy_axis_title',
];
export const STYLING_RULES: readonly DashboardRuleId[] = [
  'area_solid_fill',
  'xy_legend',
  'pie_legend_set',
  'metric_colors_background',
];
export const COLOR_FORMAT_RULES: readonly DashboardRuleId[] = [
  'legacy_palette',
  'static_color_override',
  'percent_format_on_0_100',
  'gauge_bands',
];

/**
 * Every `must` rule Enhance No Regression checks, so enhancing must not add
 * a duplicate panel. `duplicate_measure` is in no evaluator group: only the
 * enhance guidance names duplicates, as a content-mode removal candidate, so
 * neither a generated dashboard nor an appearance-mode result that must keep
 * the seeded duplicate is marked down for one. `no_controls` is left out on
 * purpose: controls are optional, and the seeded enhance fixture declares it
 * as a content defect instead.
 */
const SCORED_RULE_CANDIDATES: readonly DashboardRuleId[] = [
  ...LAYOUT_RULES,
  ...COMPOSITION_RULES,
  'duplicate_measure',
  ...TITLE_RULES,
  ...STYLING_RULES,
  ...COLOR_FORMAT_RULES,
  ...CONTROL_RULES,
];

export const SCORED_RULES: readonly DashboardRuleId[] = SCORED_RULE_CANDIDATES.filter(
  (rule) => DASHBOARD_RULES[rule].strictness === 'must'
);

export const findViolations = (
  dashboard: DashboardAttachmentData,
  rules: readonly DashboardRuleId[]
): DashboardRuleViolation[] => rules.flatMap((rule) => DASHBOARD_RULES[rule].check(dashboard));

export const getRuleScope = (rule: DashboardRuleId): RuleScope => DASHBOARD_RULES[rule].scope;

export const getRuleStrictness = (rule: DashboardRuleId): RuleStrictness =>
  DASHBOARD_RULES[rule].strictness;

export const getRuleTarget = (rule: DashboardRuleId): RuleTarget => DASHBOARD_RULES[rule].appliesTo;
