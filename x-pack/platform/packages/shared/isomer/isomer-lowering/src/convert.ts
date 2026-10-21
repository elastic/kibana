/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The whole conversion of one dashboard: plan it from its saved objects, run each panel's queries as the caller, and
// bind every panel to an Isomer node or an outcome that says why not. The caller supplies the queries' transport,
// so the lowering itself runs nothing.

import { buildEsQuery, type EsQueryConfig, type Filter, type Query } from '@kbn/es-query';
import { getNamedParams } from '@kbn/esql-utils';

import { bindChartsDashboard, type PanelOutcome } from './bind_charts';
import {
  buildDashboardContext,
  type PinnedControl,
  readPinnedControls,
  readSavedContext,
  type ResolveField,
  withCurrentControls,
} from './dashboard_context';
import { type GridData, planDashboard, type TimeRange } from './dashboard';
import type { ExecuteEsql, ExecuteSearch } from './esql_response';
import { parseSavedObjectNdjson } from './kibana/from-saved-object/ndjson';
import { bindMapPanels, type MapServices, type PanelSize } from './map_panels';
import { bindVegaPanels } from './vega_panels';

export interface ConvertedPanel {
  panelId: string;
  /** The title Kibana prints in the panel's header, if it prints one. */
  title?: string;
  /** Kibana grid units: 48 columns, 20-pixel rows. */
  grid: GridData;
  /** What Kibana's panel holds: a Lens chart kind, `vega`, `map`, `markdown`, or the panel type. */
  kind: string;
  outcome: PanelOutcome;
  /** The bound node, its `id` the panel id; absent unless `outcome` is `converted`. */
  node?: Record<string, unknown>;
  /** Engine presentation for a chart node, e.g. from its Lens state. */
  hint?: Record<string, unknown>;
}

export interface ConvertedDashboard {
  id: string;
  title: string;
  description?: string;
  /** The window every panel was queried over, absolute; absent when neither the request nor the dashboard sets one. */
  timeRange?: TimeRange;
  /** Every panel, in the dashboard's order. */
  panels: ConvertedPanel[];
  /** What of the dashboard's context couldn't be applied, such as a control whose field didn't resolve. */
  diagnostics: string[];
}

export interface ConvertDashboardOptions {
  /** The dashboard and every saved object it references, as `_export` NDJSON. */
  ndjson: string;
  dashboardId: string;
  /** Overrides the dashboard's saved time range. */
  timeRange?: TimeRange;
  /** Pins relative times; defaults to now. */
  now?: number;
  /** Runs an ES|QL query with the dashboard's DSL `filter` and named `params`, as Kibana sends them. */
  executeEsql: ExecuteEsql;
  search: ExecuteSearch;
  /** The controls on screen, in the dashboard API's as-code shape; they replace the saved ones by id. */
  controls?: readonly PinnedControl[];
  /** Resolves a control's data view and field; without it, field controls apply nothing and say so. */
  resolveField?: ResolveField;
  /** `@kbn/es-query` settings from Kibana's advanced settings, such as `ignoreFilterIfFieldNotInIndex`. */
  esQueryConfig?: Partial<EsQueryConfig>;
  /** EMS boundaries and basemaps for Maps panels; without them, choropleths refuse and basemaps fall back. */
  mapServices?: MapServices;
  /**
   * The box a panel's content draws in, from its grid box and whether it shows a title; the host's grid decides it.
   * Content whose data depends on its size, such as a map's extent, is lowered at that size.
   */
  panelSize?: (grid: GridData, layout: { titled: boolean }) => { width: number; height: number };
}

interface PanelJson {
  panelIndex: string;
  type?: string;
  title?: string;
  panelRefName?: string;
  gridData: GridData;
  embeddableConfig?: {
    title?: string;
    hidePanelTitles?: boolean;
    savedVis?: { type?: string; params?: { fontSize?: number | string } };
  };
}

/**
 * How Kibana renders a Markdown panel: a legacy Markdown visualization through `kibana_react`'s `Markdown` at its
 * `fontSize` in points (`markdown_fn` parses it as an integer, 12 by default), or the Markdown panel through
 * `EuiMarkdownFormat`.
 */
const markdownAppearance = (
  panel: PanelJson,
  references: ReadonlyArray<{ name: string; id: string }>,
  objects: ReadonlyArray<{ type?: unknown; id?: unknown; attributes?: { visState?: string } }>
): { appearance: 'kibanaLegacy'; fontSize: number } | Record<string, never> => {
  if (panel.type !== 'visualization') {
    return {};
  }
  const byValue = panel.embeddableConfig?.savedVis;
  const reference = references.find(({ name }) =>
    panel.panelRefName ? name === panel.panelRefName : name.startsWith(`${panel.panelIndex}:`)
  );
  const saved = objects.find(({ type, id }) => type === 'visualization' && id === reference?.id);
  const visState = byValue ?? (saved ? JSON.parse(saved.attributes?.visState ?? '{}') : undefined);
  if (visState?.type !== 'markdown') {
    return {};
  }
  const points = parseInt(String(visState.params?.fontSize ?? '12'), 10) || 12;
  return { appearance: 'kibanaLegacy', fontSize: Math.round(((points * 4) / 3) * 100) / 100 };
};

interface GridItem {
  node: { type: string; format?: string; body?: string; title?: string };
}

/** Converts one dashboard. Never throws for a panel: each one that can't bind says why in its outcome. */
export const convertDashboard = async ({
  ndjson,
  dashboardId,
  timeRange,
  now = Date.now(),
  executeEsql,
  search,
  controls,
  resolveField,
  esQueryConfig,
  mapServices,
  panelSize,
}: ConvertDashboardOptions): Promise<ConvertedDashboard> => {
  const objects = parseSavedObjectNdjson(ndjson) as unknown as Array<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const saved = objects.find(({ type, id }) => type === 'dashboard' && id === dashboardId);
  if (!saved) {
    throw new Error(`dashboard ${dashboardId} is not in the export`);
  }
  const panelJson = JSON.parse(saved.attributes.panelsJSON ?? '[]') as PanelJson[];
  // The dashboard's query, filters and controls go with each request as DSL, as Kibana sends them.
  const plan = (range?: TimeRange) =>
    planDashboard(ndjson, dashboardId, {
      now,
      dashboardContext: 'dsl',
      ...(range ? { timeRange: range } : {}),
    });
  let planned = plan(timeRange);
  const context = await buildDashboardContext({
    saved: readSavedContext(saved.attributes, saved.references),
    controls: withCurrentControls(readPinnedControls(saved.attributes, saved.references), controls),
    ...(planned.timeRange ? { timeRange: planned.timeRange } : {}),
    ...(resolveField ? { resolveField } : {}),
    ...(esQueryConfig ? { config: esQueryConfig } : {}),
  });
  // A time slider narrows every panel's window, as Kibana's timeslice does.
  if (context.timeslice) {
    planned = plan(context.timeslice);
  }
  const sizeOf: PanelSize | undefined = panelSize
    ? (panelId) => {
        const panel = panelJson.find(({ panelIndex }) => panelIndex === panelId);
        return panel
          ? panelSize(panel.gridData, { titled: !panel.embeddableConfig?.hidePanelTitles })
          : undefined;
      }
    : undefined;
  const dashboardFilter = { bool: context.bool } as unknown as Record<string, unknown>;
  const executeFor = (panel: (typeof planned.panels)[number]): ExecuteEsql => {
    const window = panel.timeRange ?? planned.timeRange;
    const { ignoreGlobalFilters, searchSource } = panel.query.query as {
      ignoreGlobalFilters?: boolean;
      searchSource?: { query?: Query; filters?: Filter[] };
    };
    // A Discover session's own query and filters apply with the dashboard's, as its embeddable runs them.
    const own = searchSource
      ? buildEsQuery(
          undefined,
          searchSource.query ? [searchSource.query] : [],
          searchSource.filters ?? [],
          esQueryConfig
        )
      : undefined;
    const clauses = [
      ...(ignoreGlobalFilters ? [] : [dashboardFilter]),
      ...(own ? [own as unknown as Record<string, unknown>] : []),
    ];
    const filter =
      clauses.length === 0
        ? undefined
        : clauses.length === 1
        ? clauses[0]
        : { bool: { filter: clauses } };
    return (esql, options) =>
      executeEsql(esql, {
        ...options,
        ...(filter ? { filter } : {}),
        params: getNamedParams(esql, window, context.variables as never) as Array<
          Record<string, unknown>
        >,
      });
  };
  const [charts, vega, maps] = await Promise.all([
    bindChartsDashboard(planned, executeEsql, executeFor),
    bindVegaPanels(planned, search, context.bool, mapServices, sizeOf),
    bindMapPanels(objects, dashboardId, planned.timeRange, context.bool, {
      search,
      executeEsql,
      ...(mapServices ? { services: mapServices } : {}),
      ...(esQueryConfig ? { esQueryConfig } : {}),
      ...(sizeOf ? { panelSize: sizeOf } : {}),
    }),
  ]);

  const nodes = new Map(
    charts.composition.body.map((node) => [String(node.id), node as Record<string, unknown>])
  );
  const bound = new Map<string, Omit<ConvertedPanel, 'grid'>>();
  for (const { panelId, title, chartKind, outcome } of charts.panels) {
    const node = nodes.get(panelId);
    const hint = charts.hints[panelId];
    bound.set(panelId, {
      panelId,
      title,
      kind: chartKind,
      outcome,
      ...(node ? { node } : {}),
      ...(hint ? { hint } : {}),
    });
  }
  for (const { panelId, title, chartKind, outcome, node } of [...vega, ...maps]) {
    bound.set(panelId, { panelId, title, kind: chartKind, outcome, ...(node ? { node } : {}) });
  }

  // The plan's grid holds one item per panel, in panel order; non-Lens panels are only there.
  const gridItems = (planned.spec.body as Array<{ type: string; items?: GridItem[] }>)
    .filter(({ type }) => type === 'dashboardGrid')
    .flatMap(({ items }) => items ?? []);

  return {
    id: dashboardId,
    title: planned.title,
    ...(saved.attributes.description ? { description: saved.attributes.description } : {}),
    ...(planned.timeRange ? { timeRange: planned.timeRange } : {}),
    diagnostics: context.diagnostics,
    panels: panelJson.map((panel, index): ConvertedPanel => {
      const { panelIndex: panelId, gridData, embeddableConfig } = panel;
      const authoredTitle = embeddableConfig?.title ?? panel.title;
      const shown = (title: string | undefined) =>
        embeddableConfig?.hidePanelTitles || !title ? {} : { title };
      const grid = { x: gridData.x, y: gridData.y, w: gridData.w, h: gridData.h };
      const fromBinding = bound.get(panelId);
      const item = gridItems[index]?.node;
      if (fromBinding) {
        // A saved search binds with an empty label; its title is the planned item's.
        return {
          ...fromBinding,
          ...shown(authoredTitle ?? (fromBinding.title || item?.title)),
          grid,
        };
      }
      if (item?.type === 'text' && item.format === 'markdown') {
        return {
          panelId,
          ...shown(authoredTitle ?? item.title),
          grid,
          kind: 'markdown',
          outcome: { status: 'converted', nodeType: 'markdown' },
          node: {
            id: panelId,
            type: 'markdown',
            text: item.body ?? '',
            ...markdownAppearance(panel, saved.references ?? [], objects),
          },
        };
      }
      return {
        panelId,
        ...shown(authoredTitle ?? item?.title),
        grid,
        kind: panel.type ?? item?.type ?? 'unknown',
        outcome: { status: 'outside', reason: `${item?.type ?? panel.type ?? 'unknown'} panel` },
      };
    }),
  };
};
