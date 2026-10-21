/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A dashboard's Kibana Vega panels as the Vega pack's `vega` node: each Elasticsearch source runs over the
// dashboard's window as the caller and is inlined as `values`, or the panel is refused. Ported from
// `charts-convert` `scripts/add_vega_panels.ts`.

import type { PanelOutcome } from './bind_charts';
import type { PlannedDashboard } from './dashboard';
import type { ExecuteSearch } from './esql_response';
import {
  inlineVegaData,
  kibanaSearchBody,
  type VegaSpec,
  vegaRefusal,
  withoutKibanaConfig,
} from './vega';

export interface BoundPanel {
  panelId: string;
  title: string;
  chartKind: string;
  outcome: PanelOutcome;
  node?: Record<string, unknown>;
}

interface PlanVegaNode {
  mode: 'vega' | 'vega-lite';
  spec: VegaSpec;
  width: number;
  height: number;
  caption: string;
}

/** The planner titles a Vega spec with its panel's title for a chromeless view; a dashboard panel prints it itself. */
const withoutPanelTitle = (spec: VegaSpec, title: string): VegaSpec => {
  if (spec.title !== title) {
    return spec;
  }
  const { title: _panelTitle, ...rest } = spec;
  return rest;
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** One sentence: what the panel draws, from which index, over which window. */
const captionOf = (title: string, indices: readonly string[], from?: string, to?: string) =>
  `${title.replace(/^\[[^\]]+\]\s*/, '')}, from ${indices.join(' and ')}${
    from && to ? ` between ${day(from)} and ${day(to)}` : ''
  }.`;

/** Binds every planned Vega panel, running its sources through `search`. */
export const bindVegaPanels = (
  planned: PlannedDashboard,
  search: ExecuteSearch
): Promise<BoundPanel[]> =>
  Promise.all(
    planned.vegaPanels.map(async ({ panelId, specPath, sources }): Promise<BoundPanel> => {
      const planNode = specPath.reduce<unknown>(
        (cursor, key) => (cursor as Record<string | number, unknown>)[key],
        planned.spec
      ) as PlanVegaNode;
      const title = planNode.caption;
      const report = (outcome: PanelOutcome): BoundPanel => ({
        panelId,
        title,
        chartKind: 'vega',
        outcome,
      });
      const refusal = vegaRefusal(planNode.spec);
      if (refusal) {
        return report({ status: 'refused', nodeType: 'vega', reasons: [refusal] });
      }
      try {
        const resolved = await Promise.all(
          sources.map(async ({ path, url, runtimeMappings }) => ({
            path,
            values: await search(
              url.index,
              kibanaSearchBody(url, { timeRange: planned.timeRange, runtimeMappings })
            ),
          }))
        );
        return {
          ...report({ status: 'converted', nodeType: 'vega' }),
          node: {
            id: panelId,
            type: 'vega',
            mode: planNode.mode,
            spec: withoutPanelTitle(
              withoutKibanaConfig(inlineVegaData(planNode.spec, resolved)),
              title
            ),
            width: planNode.width,
            height: planNode.height,
            caption: captionOf(
              title,
              [...new Set(sources.map(({ url }) => url.index))],
              planned.timeRange?.from,
              planned.timeRange?.to
            ),
          },
        };
      } catch (error) {
        return report({
          status: 'refused',
          nodeType: 'vega',
          reasons: [error instanceof Error ? error.message : String(error)],
        });
      }
    })
  );
