/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BodyNode, ViewSpec } from '../adaptive_nodes';
import type { AdaptiveDashboard, AdaptivePanel } from '../model/adaptive_dashboard';
import type { AdaptiveLens, PrimitiveRenderHints } from '../model/adaptive_lens';
import type { AdaptiveQuery } from '../model/adaptive_query';
import type { AdaptivePrimitiveProfile, ReductionPolicy } from '../model/reductions';

import { injectWherePredicates } from './inject_where';
import { buildPlaceholderNode } from './placeholder_node';
import { reductionsForChart, renderingHintsForChart } from './plan_adaptive_lens';
import type {
  BodyPath,
  ViewPlan,
  ViewPlanBinding,
  ViewPlanDiagnostic,
  ViewPlanQuery,
} from './view_plan';

export interface PlanAdaptiveDashboardOptions {
  /**
   * `'flat'` (default) emits every panel as a top-level body item — the
   * mobile/report reflow shape. `'rows'` honours the dashboard's
   * `layoutHint.rows` and groups panels into `row` primitives. Hosts that
   * support responsive switching can request the rows shape and let CSS
   * collapse them on narrow viewports.
   *
   * `'grid'` emits a `dashboardGrid` primitive that preserves Kibana's
   * authored x/y/w/h geometry. `'auto'` emits the same geometry but lets the
   * renderer flow panels vertically on narrow containers. `'flow'` uses the
   * grid panel order but always renders vertically.
   */
  layout?:
    | 'flat'
    | 'rows'
    | 'grid'
    | 'auto'
    | 'flow'
    | {
        mode: 'flat' | 'rows' | 'grid' | 'auto' | 'flow';
        rowHeight?: number;
      };
  /**
   * Diagnostics carried over from the lowering step (e.g.
   * `fromKibanaDashboardSavedObject`). Merged into `plan.diagnostics`.
   */
  diagnostics?: ViewPlanDiagnostic[];
  /**
   * `compact` preserves the byte-budget defaults; `full` allows denser
   * chart/table payloads and richer marks for high-fidelity previews.
   */
  profile?: AdaptivePrimitiveProfile;
  reductions?: ReductionPolicy;
  rendering?: PrimitiveRenderHints;
}

type DashboardLayoutConfig = Exclude<PlanAdaptiveDashboardOptions['layout'], string | undefined> & {
  mode: 'flat' | 'rows' | 'grid' | 'auto' | 'flow';
};

type RowWidth = 'quarter' | 'third' | 'half' | 'full';

/**
 * Distribute equal widths across a row. The `row` primitive only supports
 * `quarter | third | half | full`, so rows with more than four items are
 * truncated by the caller (4-per-row is also Kibana's standard density).
 */
const widthForRowSize = (count: number): RowWidth => {
  if (count <= 1) {
    return 'full';
  }
  if (count === 2) {
    return 'half';
  }
  if (count === 3) {
    return 'third';
  }
  return 'quarter';
};

/**
 * Merge a dashboard-level time range and filter set into a panel-level
 * AdaptiveQuery. The host is still responsible for replacing `?_tstart` and
 * `?_tend` parameter slots at execution time; the planner simply records the
 * resolved range so the binder/diagnostics can surface it.
 */
const mergeQueryContext = (
  panelQuery: AdaptiveQuery,
  dashboard: AdaptiveDashboard
): AdaptiveQuery => {
  const merged: AdaptiveQuery = { ...panelQuery };
  if (dashboard.timeRange) {
    const params = { ...(merged.params ?? {}) };
    if (!('_tstart' in params)) {
      params['_tstart'] = dashboard.timeRange.from;
    }
    if (!('_tend' in params)) {
      params['_tend'] = dashboard.timeRange.to;
    }
    if (dashboard.timeRange.timezone && !('_tz' in params)) {
      params['_tz'] = dashboard.timeRange.timezone;
    }
    merged.params = params;
  }
  // The panel's source layer opted out of global filter context, so the
  // dashboard's own predicates are not its to carry either. The time range
  // above still merges: that is a separate control in Kibana.
  const predicates = merged.ignoreGlobalFilters
    ? []
    : (dashboard.filters ?? [])
        .map((filter) => filter.esql)
        .filter((esql): esql is string => typeof esql === 'string' && esql.trim().length > 0);
  if (predicates.length > 0) {
    merged.esql = injectWherePredicates(merged.esql, predicates);
  }
  return merged;
};

interface PanelPlanResult {
  node: BodyNode;
  queries: ViewPlanQuery[];
  bindings: ViewPlanBinding[];
  diagnostics: ViewPlanDiagnostic[];
  /**
   * Path mutation: every `binding.specPath` produced inside this helper is
   * relative to the panel node it sits inside. The caller rewrites those
   * paths to match the panel's final position in `spec.body` (flat or
   * row-nested).
   */
}

const planLensPanel = (
  lens: AdaptiveLens,
  dashboard: AdaptiveDashboard,
  options: Pick<PlanAdaptiveDashboardOptions, 'profile' | 'reductions' | 'rendering'>
): PanelPlanResult => {
  const placeholder = buildPlaceholderNode({
    title: lens.title,
    chart: lens.chart,
  });
  const mergedQuery = mergeQueryContext(lens.query, dashboard);
  const query: ViewPlanQuery = {
    id: lens.id,
    query: mergedQuery,
    chart: lens.chart,
    label: lens.title,
    // Carry the dashboard author's numeric format hint (percent, bytes, …)
    // so `bindViewPlan` can render the panel's value the way Lens would.
    // Without this thread-through the dashboard binder always falls back to
    // the raw number, which is the bug the site sandbox surfaced.
    ...(lens.format ? { format: lens.format } : {}),
    ...(() => {
      const reductions = reductionsForChart(
        lens.chart,
        options.profile,
        lens.reductions,
        options.reductions
      );
      return reductions ? { reductions } : {};
    })(),
    ...(() => {
      const profileHints = renderingHintsForChart(lens.chart, options.profile);
      const rendering = {
        ...(profileHints ?? {}),
        ...(lens.rendering ?? {}),
        ...(options.rendering ?? {}),
      };
      return Object.keys(rendering).length > 0 ? { rendering } : {};
    })(),
  };
  const trendQuery =
    lens.chart.kind === 'metric' && lens.chart.trend?.query
      ? {
          id: `${lens.id}:trend`,
          query: lens.chart.trend.query,
          chart: lens.chart,
          label: `${lens.title} trend`,
          ...(lens.format ? { format: lens.format } : {}),
        }
      : undefined;
  const binding: ViewPlanBinding = {
    queryId: lens.id,
    // Caller rewrites this; the panel doesn't know its final body slot yet.
    specPath: [],
    chart: lens.chart,
    ...(trendQuery ? { auxiliaryQueryIds: { trend: trendQuery.id } } : {}),
    ...(lens.references ? { references: lens.references } : {}),
    ...(query.reductions ? { reductions: query.reductions } : {}),
    ...(query.rendering ? { rendering: query.rendering } : {}),
  };
  return {
    node: placeholder,
    queries: trendQuery ? [query, trendQuery] : [query],
    bindings: [binding],
    diagnostics: [],
  };
};

const planNonLensPanel = (
  panel: Exclude<AdaptivePanel, { type: 'lens' }>,
  dashboard: AdaptiveDashboard,
  options: Pick<PlanAdaptiveDashboardOptions, 'profile' | 'reductions'>
): PanelPlanResult => {
  switch (panel.type) {
    case 'markdown':
      return {
        node: {
          type: 'text',
          ...(panel.title ? { title: panel.title } : {}),
          body: panel.body,
          format: 'markdown',
        },
        queries: [],
        bindings: [],
        diagnostics: [],
      };
    case 'links':
      return {
        node: {
          type: 'actions',
          items: panel.items.map((item) => ({
            label: item.label,
            href: item.href,
            variant: 'empty',
          })),
        },
        queries: [],
        bindings: [],
        diagnostics: panel.title
          ? [
              {
                level: 'info',
                code: 'plan.dashboard.links-title-dropped',
                message: `actions primitive has no title; dropped "${panel.title}"`,
              },
            ]
          : [],
      };
    case 'image':
      return {
        node: {
          type: 'image',
          src: panel.src,
          alt: panel.alt ?? '',
          ...(panel.caption ? { caption: panel.caption } : {}),
        },
        queries: [],
        bindings: [],
        diagnostics: [],
      };
    case 'maps':
      return {
        node: panel.snapshot
          ? {
              type: 'image',
              src: panel.snapshot.src,
              alt: panel.snapshot.alt,
              caption: panel.title,
            }
          : {
              type: 'callout',
              tone: 'warning',
              title: panel.title,
              body: `Map preview unavailable. Open in Kibana: ${panel.deepLink}`,
            },
        queries: [],
        bindings: [],
        diagnostics: [
          {
            level: 'info',
            code: 'plan.dashboard.maps-degraded',
            message: 'Maps panel rendered as image snapshot (or callout fallback)',
          },
        ],
      };
    case 'savedSearch': {
      // Saved searches render as a flat table; reuse the datatable chart
      // machinery so the binder produces a real `table` primitive on data
      // arrival.
      const datatableChart = {
        kind: 'datatable' as const,
        columns: panel.columns,
      };
      const id = `savedSearch:${panel.title}`;
      const reductions = reductionsForChart(
        datatableChart,
        options.profile,
        undefined,
        options.reductions
      );
      return {
        node: buildPlaceholderNode({
          title: panel.title,
          chart: datatableChart,
        }),
        queries: [
          {
            id,
            query: mergeQueryContext(panel.query, dashboard),
            chart: datatableChart,
            label: panel.title,
            ...(reductions ? { reductions } : {}),
          },
        ],
        bindings: [
          {
            queryId: id,
            specPath: [],
            chart: datatableChart,
            ...(reductions ? { reductions } : {}),
          },
        ],
        diagnostics: [],
      };
    }
    case 'vega':
      // `planDashboard` sizes it from the grid; the host inlines its data before validation.
      return {
        node: {
          type: 'vega',
          mode: panel.mode,
          spec: 'title' in panel.spec ? panel.spec : { ...panel.spec, title: panel.title },
          width: 640,
          height: 400,
          caption: panel.title,
        },
        queries: [],
        bindings: [],
        diagnostics: [],
      };
    case 'unsupported':
    default:
      return {
        node: {
          type: 'callout',
          tone: 'warning',
          title: panel.title ?? 'Unsupported panel',
          body: panel.deepLink
            ? `${panel.reason}\n\nOpen in Kibana: ${panel.deepLink}`
            : panel.reason,
        },
        queries: [],
        bindings: [],
        diagnostics: [
          {
            level: 'warn',
            code: 'plan.dashboard.unsupported-panel',
            message: `unsupported panel surfaced as a callout: ${panel.reason}`,
          },
        ],
      };
  }
};

const planPanel = (
  panel: AdaptivePanel,
  dashboard: AdaptiveDashboard,
  options: Pick<PlanAdaptiveDashboardOptions, 'profile' | 'reductions' | 'rendering'>
): PanelPlanResult =>
  panel.type === 'lens'
    ? planLensPanel(panel.lens, dashboard, options)
    : planNonLensPanel(panel, dashboard, options);

const resolveLayoutConfig = (
  layout: PlanAdaptiveDashboardOptions['layout']
): DashboardLayoutConfig => {
  if (!layout) {
    return { mode: 'flat' };
  }
  return typeof layout === 'string' ? { mode: layout } : layout;
};

/**
 * Produce a {@link ViewPlan} for an {@link AdaptiveDashboard}.
 *
 * The returned `plan.spec.body` either stacks panels vertically (`'flat'`)
 * or groups them into `row` primitives using the dashboard's `layoutHint`
 * (`'rows'`). The binder walks the resulting `bindings` and replaces each
 * placeholder with the bound chart at the recorded path.
 */
export const planAdaptiveDashboard = (
  dashboard: AdaptiveDashboard,
  options: PlanAdaptiveDashboardOptions = {}
): ViewPlan => {
  const layout = resolveLayoutConfig(options.layout);
  const queries: ViewPlanQuery[] = [];
  const bindings: ViewPlanBinding[] = [];
  const diagnostics: ViewPlanDiagnostic[] = [...(options.diagnostics ?? [])];

  const plannedPanels = dashboard.panels.map((panel) => planPanel(panel, dashboard, options));
  for (const plan of plannedPanels) {
    queries.push(...plan.queries);
    diagnostics.push(...plan.diagnostics);
  }

  const body: BodyNode[] = [];
  if (
    (layout.mode === 'grid' || layout.mode === 'auto' || layout.mode === 'flow') &&
    dashboard.layoutHint?.grid
  ) {
    const coveredPanelIndices = new Set<number>();
    const gridItems: Extract<BodyNode, { type: 'dashboardGrid' }>['items'] = [];
    for (const item of dashboard.layoutHint.grid.items) {
      const plan = plannedPanels[item.panelIndex];
      if (!plan) {
        continue;
      }
      const specPath: BodyPath = ['body', 0, 'items', gridItems.length, 'node'];
      for (const binding of plan.bindings) {
        bindings.push({ ...binding, specPath });
      }
      gridItems.push({
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        node: plan.node,
      });
      coveredPanelIndices.add(item.panelIndex);
    }

    const nextY = Math.max(0, ...gridItems.map((item) => item.y + item.h));
    plannedPanels.forEach((plan, panelIndex) => {
      if (coveredPanelIndices.has(panelIndex)) {
        return;
      }
      const specPath: BodyPath = ['body', 0, 'items', gridItems.length, 'node'];
      for (const binding of plan.bindings) {
        bindings.push({ ...binding, specPath });
      }
      gridItems.push({
        x: 0,
        y: nextY + gridItems.length,
        w: dashboard.layoutHint?.grid?.columns ?? 24,
        h: 8,
        node: plan.node,
      });
    });

    body.push({
      type: 'dashboardGrid',
      mode: layout.mode === 'grid' ? 'grid' : layout.mode === 'flow' ? 'flow' : 'auto',
      columns: dashboard.layoutHint.grid.columns,
      ...(layout.rowHeight ?? dashboard.layoutHint.grid.rowHeight
        ? {
            rowHeight: layout.rowHeight ?? dashboard.layoutHint.grid.rowHeight,
          }
        : {}),
      items: gridItems,
    });
  } else if (layout.mode === 'flat' || !dashboard.layoutHint) {
    plannedPanels.forEach((plan, index) => {
      const specPath: BodyPath = ['body', body.length];
      for (const binding of plan.bindings) {
        bindings.push({ ...binding, specPath });
      }
      body.push(plan.node);
      if (layout.mode === 'rows' && !dashboard.layoutHint && plan.bindings.length > 0) {
        diagnostics.push({
          level: 'info',
          code: 'plan.dashboard.no-layout-hint',
          message: `panel #${index} falling back to flat layout (no layoutHint.rows)`,
        });
      }
    });
  } else {
    for (const rowSpec of dashboard.layoutHint.rows) {
      // Single-panel rows render as a flat body item (cheaper than a row
      // primitive with one full-width child).
      if (rowSpec.length === 1) {
        const panelIndex = rowSpec[0]!;
        const plan = plannedPanels[panelIndex];
        if (!plan) {
          continue;
        }
        const specPath: BodyPath = ['body', body.length];
        for (const binding of plan.bindings) {
          bindings.push({ ...binding, specPath });
        }
        body.push(plan.node);
        continue;
      }
      const rowIndex = body.length;
      // Cap each row at four items — the `row` primitive only has four
      // width buckets and beyond that the layout becomes unusable on
      // every surface anyway. Trailing items spill to a new row below.
      const chunks: number[][] = [];
      for (let i = 0; i < rowSpec.length; i += 4) {
        chunks.push(rowSpec.slice(i, i + 4));
      }
      if (chunks.length > 1) {
        diagnostics.push({
          level: 'info',
          code: 'plan.dashboard.row-split',
          message: `row with ${rowSpec.length} panels split across ${chunks.length} sub-rows (max 4 per row)`,
        });
      }
      for (const chunk of chunks) {
        const subRowIndex = body.length;
        const width = widthForRowSize(chunk.length);
        const rowItems: Array<{ width: RowWidth; node: BodyNode }> = [];
        chunk.forEach((panelIndex, itemIndex) => {
          const plan = plannedPanels[panelIndex];
          if (!plan) {
            return;
          }
          const specPath: BodyPath = ['body', subRowIndex, 'items', itemIndex, 'node'];
          for (const binding of plan.bindings) {
            bindings.push({ ...binding, specPath });
          }
          rowItems.push({ width, node: plan.node });
        });
        if (rowItems.length === 0) {
          continue;
        }
        body.push({ type: 'row', items: rowItems });
      }
      void rowIndex;
    }
  }

  const spec: ViewSpec = {
    type: 'view',
    title: dashboard.title,
    ...(dashboard.subtitle ? { subtitle: dashboard.subtitle } : {}),
    body,
    ...(dashboard.provenance
      ? {
          meta: {
            source: dashboard.provenance.source,
            ...(dashboard.provenance.kibanaUrl
              ? {
                  provenance: {
                    source: dashboard.provenance.source,
                    provider: 'kibana',
                  },
                }
              : {}),
          },
        }
      : {}),
  };

  return { spec, queries, bindings, diagnostics };
};
