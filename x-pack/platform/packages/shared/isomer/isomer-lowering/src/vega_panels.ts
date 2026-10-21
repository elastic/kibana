/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A dashboard's Kibana Vega panels as the Vega pack's `vega` node: each Elasticsearch source runs over the
// dashboard's window as the caller and is inlined as `values`, or the panel is refused. Ported from
// `charts-convert` `scripts/add_vega_panels.ts`.

import {
  MAX_RESULTS_CHARS,
  pruneVegaResults,
  vegaBorealisDarkTheme,
  vegaBorealisLightTheme,
  type VegaResult,
} from '@kbn/isomer-primitives-vega';

import type { PanelOutcome } from './bind_charts';
import type { MapServices } from './map_panels';
import type { PlannedDashboard } from './dashboard';
import type { ExecuteSearch } from './esql_response';
import {
  type DashboardBool,
  inlineVegaData,
  kibanaSearchBody,
  type VegaSpec,
  vegaRefusal,
  withoutKibanaConfig,
} from './vega';
import {
  basemapTiles,
  isKibanaMap,
  kibanaConfigOf,
  kibanaMapStyle,
  lowerKibanaMapSpec,
  parseKibanaMapView,
} from './vega_map';

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

/** A map-mode panel as Kibana draws it: the spec over its map's projection, and the basemap tiles beneath. */
const lowerMapMode = async (
  { mode, spec }: { mode: PlanVegaNode['mode']; spec: VegaSpec },
  kibana: Record<string, unknown>,
  size: { width: number; height: number },
  services: MapServices
) => {
  const { view, warnings } = parseKibanaMapView(kibana);
  const notes = [...warnings];
  const lowered = lowerKibanaMapSpec({ mode, spec }, view, size);
  const style = kibanaMapStyle(view, services.darkMode);
  if (!style) {
    return { spec: lowered, notes };
  }
  const basemap = services.basemap
    ? await services.basemap(style, {
        lat: view.latitude,
        lon: view.longitude,
        zoom: view.zoom,
        ...size,
      })
    : undefined;
  if (!basemap) {
    notes.push(
      `the ${style} basemap is ${
        services.basemap ? 'not in EMS' : 'not available'
      }; the chart draws without it`
    );
    return { spec: lowered, notes };
  }
  const tiles = basemapTiles(basemap, view, size);
  return { spec: lowered, notes, basemap: { tiles } };
};

type Entry = Record<string, unknown>;

const at = (root: unknown, path: ReadonlyArray<string | number>): Entry =>
  path.reduce<unknown>(
    (cursor, key) => (cursor as Record<string | number, unknown>)[key],
    root
  ) as Entry;

/** Where each source marker landed in a compiled spec, by source index. */
const locateSources = (spec: unknown): Map<number, Array<string | number>> => {
  const found = new Map<number, Array<string | number>>();
  const visit = (value: unknown, path: Array<string | number>) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, index]));
      return;
    }
    if (value === null || typeof value !== 'object') return;
    const { values } = value as Entry;
    const marker = Array.isArray(values) && values.length === 1 ? (values[0] as Entry) : undefined;
    if (typeof marker?.__isomerSource === 'number') {
      found.set(marker.__isomerSource, path);
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, [...path, key]);
  };
  visit(spec, []);
  return found;
};

/** Binds every planned Vega panel, running its sources through `search`. */
export const bindVegaPanels = (
  planned: PlannedDashboard,
  search: ExecuteSearch,
  /** The dashboard's query, filters and controls, for `%context%` and `%dashboard_context-*%`. */
  context: DashboardBool = {},
  /** EMS basemaps for map-mode specs; without them a map draws without its basemap. */
  services: MapServices = {}
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
              kibanaSearchBody(url, { timeRange: planned.timeRange, runtimeMappings, context })
            ),
          }))
        );
        const kibana = kibanaConfigOf(planNode.spec);
        // The spec as authored, its queries in place; each query's result goes beside it, by the data entry's path.
        const authored = withoutPanelTitle(withoutKibanaConfig(planNode.spec), title);
        const size = { width: planNode.width, height: planNode.height };
        let mode = planNode.mode;
        let spec = authored;
        let results: VegaResult[] = resolved.map(({ path, values }) => ({
          path,
          values,
          scope: 'static',
        }));
        let map: Awaited<ReturnType<typeof lowerMapMode>> | undefined;
        if (kibana && isKibanaMap(planNode.spec)) {
          if (mode === 'vega-lite') {
            // Kibana resolves a source before it compiles Vega-Lite, so each source compiles as a marker and is
            // found again in the compiled spec, where its query goes back.
            const marked = inlineVegaData(
              authored,
              resolved.map(({ path }, index) => ({ path, values: [{ __isomerSource: index }] }))
            );
            map = await lowerMapMode({ mode, spec: marked }, kibana, size, services);
            const located = locateSources(map.spec);
            results = resolved.map(({ path, values }, index) => {
              const compiled = located.get(index);
              if (!compiled) {
                throw new Error(`Vega-Lite compiled data source ${path.join('.')} away`);
              }
              const entry = at(map!.spec, compiled);
              delete entry.values;
              entry.url = at(authored, path).url;
              return { path: compiled, values, scope: 'static' };
            });
          } else {
            map = await lowerMapMode({ mode, spec: authored }, kibana, size, services);
          }
          mode = 'vega';
          spec = map.spec;
        }
        const node = pruneVegaResults({ mode, spec, results, ...size }, [
          vegaBorealisLightTheme,
          vegaBorealisDarkTheme,
        ]);
        const characters = JSON.stringify(node.results).length;
        if (characters > MAX_RESULTS_CHARS) {
          return report({
            status: 'refused',
            nodeType: 'vega',
            reasons: [
              `its query results are ${characters} characters after pruning to what the drawing reads; a chart holds ${MAX_RESULTS_CHARS}`,
            ],
          });
        }
        return {
          ...report({
            status: 'converted',
            nodeType: 'vega',
            ...(map?.notes.length ? { notes: map.notes } : {}),
          }),
          node: {
            id: panelId,
            type: 'vega',
            mode,
            spec,
            ...(node.results?.length ? { results: node.results } : {}),
            ...(map?.basemap ? { basemap: map.basemap } : {}),
            ...size,
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
