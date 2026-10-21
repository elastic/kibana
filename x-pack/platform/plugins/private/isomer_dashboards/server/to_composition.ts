/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConvertedDashboard, ConvertedPanel, PanelOutcome } from '@kbn/isomer-lowering';
import type { DashboardNode, DashboardPanel } from '@kbn/isomer-primitives-dashboard';
import type { DashboardLayout } from '../common';

type Node = Record<string, unknown> & { type: string; id?: string };

// Chart types whose engine draws the title inside the chart, as Lens's metric does.
const DRAWS_OWN_TITLE = new Set(['metricTrend', 'gauge']);
const CHART_TYPES = new Set(['xyChart', 'donut', 'treemap', 'heatmap', 'metricTrend', 'gauge']);

/** Why a panel has no node, in one sentence. */
export const reasonFor = (outcome: PanelOutcome): string => {
  switch (outcome.status) {
    case 'refused':
      return `Isomer can't draw this ${outcome.nodeType} faithfully yet: ${
        outcome.reasons[0] ?? ''
      }`;
    case 'outside':
      return `Isomer has no node for this panel yet (${outcome.reason}).`;
    case 'failed':
      return `The panel's query failed: ${outcome.reason}`;
    case 'empty':
      return 'No results in this time range.';
    default:
      return 'Nothing to show.';
  }
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** A window as words: "Oct 13, 2026 – Oct 20, 2026". */
export const periodOf = ({
  timeRange,
}: Pick<ConvertedDashboard, 'timeRange'>): string | undefined =>
  timeRange && !Number.isNaN(Date.parse(timeRange.from)) && !Number.isNaN(Date.parse(timeRange.to))
    ? `${day(timeRange.from)} – ${day(timeRange.to)}`
    : undefined;

/** Kibana prints a panel's title in its header, so a chart that draws its own gives it up; one that doesn't drops its own. */
const titled = ({ title }: ConvertedPanel, node: Node): { title?: string; body: Node } => {
  if (!CHART_TYPES.has(node.type)) {
    return { ...(title ? { title } : {}), body: node };
  }
  if (DRAWS_OWN_TITLE.has(node.type)) {
    return node.title === title || !title ? { body: node } : { title, body: node };
  }
  const { title: own, ...rest } = node;
  const shown = title ?? (typeof own === 'string' ? own : undefined);
  return { ...(shown ? { title: shown } : {}), body: rest as Node };
};

export interface DashboardComposition {
  composition: { type: 'view'; body: [DashboardNode] };
  /** Lens presentation hints by node id, for the chart engine. */
  hints: Record<string, Record<string, unknown>>;
}

/**
 * A converted dashboard as one `dashboard` node. `valid` checks a panel's node alone, so one bad panel becomes a
 * placeholder rather than failing the whole dashboard.
 */
export const toDashboardComposition = (
  converted: ConvertedDashboard,
  {
    layout,
    href,
    valid,
  }: {
    layout: DashboardLayout;
    /** The panel's dashboard in Kibana, for placeholders. */
    href?: string;
    valid: (node: Node) => string | undefined;
  }
): DashboardComposition => {
  const hints: Record<string, Record<string, unknown>> = {};
  const panels = converted.panels.map((panel): DashboardPanel => {
    const placeholder = (reason: string): DashboardPanel => ({
      id: panel.panelId,
      ...(panel.title ? { title: panel.title } : {}),
      grid: panel.grid,
      placeholder: { reason: reason.slice(0, 2000), ...(href ? { href } : {}) },
    });
    if (!panel.node) {
      return placeholder(reasonFor(panel.outcome));
    }
    const { title, body } = titled(panel, panel.node as Node);
    const invalid = valid(body);
    if (invalid) {
      return placeholder(`Isomer couldn't validate this panel: ${invalid}`);
    }
    if (panel.hint) {
      hints[panel.panelId] = panel.hint;
    }
    return {
      id: panel.panelId,
      ...(title ? { title } : {}),
      grid: panel.grid,
      body: body as DashboardPanel['body'],
      // A metric or gauge draws its own title and frame, so it fills the panel, as Lens's do.
      ...(!title && DRAWS_OWN_TITLE.has(body.type) ? { frame: 'none' as const } : {}),
    };
  });
  const period = periodOf(converted);
  return {
    composition: {
      type: 'view',
      body: [
        {
          type: 'dashboard',
          title: converted.title,
          ...(converted.description ? { description: converted.description.slice(0, 2000) } : {}),
          ...(period ? { period } : {}),
          layout,
          panels,
        },
      ],
    },
    hints,
  };
};
