/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The whole conversion of one dashboard: plan it from its saved objects, run each panel's queries as the caller, and
// bind every panel to an Isomer node or an outcome that says why not. The caller supplies the queries' transport,
// so the lowering itself runs nothing.

import { bindChartsDashboard, type PanelOutcome } from './bind_charts';
import { type GridData, planDashboard, type TimeRange } from './dashboard';
import type { ExecuteEsql, ExecuteSearch } from './esql_response';
import { parseSavedObjectNdjson } from './kibana/from-saved-object/ndjson';
import { bindMapPanels } from './map_panels';
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
}

export interface ConvertDashboardOptions {
  /** The dashboard and every saved object it references, as `_export` NDJSON. */
  ndjson: string;
  dashboardId: string;
  /** Overrides the dashboard's saved time range. */
  timeRange?: TimeRange;
  /** Pins relative times; defaults to now. */
  now?: number;
  executeEsql: ExecuteEsql;
  search: ExecuteSearch;
}

interface PanelJson {
  panelIndex: string;
  type?: string;
  title?: string;
  gridData: GridData;
  embeddableConfig?: { title?: string; hidePanelTitles?: boolean };
}

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
}: ConvertDashboardOptions): Promise<ConvertedDashboard> => {
  const objects = parseSavedObjectNdjson(ndjson) as unknown as Array<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const saved = objects.find(({ type, id }) => type === 'dashboard' && id === dashboardId);
  if (!saved) {
    throw new Error(`dashboard ${dashboardId} is not in the export`);
  }
  const panelJson = JSON.parse(saved.attributes.panelsJSON ?? '[]') as PanelJson[];
  const planned = planDashboard(ndjson, dashboardId, { now, ...(timeRange ? { timeRange } : {}) });
  const [charts, vega, maps] = await Promise.all([
    bindChartsDashboard(planned, executeEsql),
    bindVegaPanels(planned, search),
    bindMapPanels(objects, dashboardId, planned.timeRange, search),
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
    panels: panelJson.map((panel, index): ConvertedPanel => {
      const { panelIndex: panelId, gridData, embeddableConfig } = panel;
      const authoredTitle = embeddableConfig?.title ?? panel.title;
      const shown = (title: string | undefined) =>
        embeddableConfig?.hidePanelTitles || !title ? {} : { title };
      const grid = { x: gridData.x, y: gridData.y, w: gridData.w, h: gridData.h };
      const fromBinding = bound.get(panelId);
      if (fromBinding) {
        return { ...fromBinding, ...shown(authoredTitle ?? fromBinding.title), grid };
      }
      const item = gridItems[index]?.node;
      if (item?.type === 'text' && item.format === 'markdown') {
        return {
          panelId,
          ...shown(authoredTitle ?? item.title),
          grid,
          kind: 'markdown',
          outcome: { status: 'converted', nodeType: 'markdown' },
          node: { id: panelId, type: 'markdown', text: item.body ?? '' },
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
