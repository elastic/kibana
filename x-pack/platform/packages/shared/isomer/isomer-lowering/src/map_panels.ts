/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A dashboard's Kibana Maps panels as the maps pack's `map` node: the dashboard's view of the map, and each layer
// visible at its zoom run over the window as the caller. Layers the node cannot draw faithfully are listed in the
// outcome as omitted, never dropped silently. Ported from `charts-convert` `scripts/add_map_panels.ts`.

import type { PanelOutcome } from './bind_charts';
import type { TimeRange } from './dashboard';
import type { ExecuteSearch } from './esql_response';
import type { DashboardBool } from './vega';
import type { BoundPanel } from './vega_panels';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

/** Kibana Maps' ramp names as the maps pack spells them. */
const RAMPS: Record<string, string> = {
  Blues: 'blues',
  Greens: 'greens',
  Greys: 'greys',
  Reds: 'reds',
  'Yellow to Red': 'yellow_to_red',
  'Green to Red': 'green_to_red',
  'Blue to Red': 'blue_to_red',
};

/** Kibana's dashboard grid at a 1600-pixel viewport: a panel's chart area, as the captured panels measure. */
export const mapChartArea = ({ w, h }: { w: number; h: number }) => ({
  width: Math.round((w * 1484) / 48) - 24,
  height: h * 28 - 56,
});

const lonToX = (lon: number) => (lon + 180) / 360;
const latToY = (lat: number) => {
  const rad = (Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
};
const xToLon = (x: number) => x * 360 - 180;
const yToLat = (y: number) => {
  const n = Math.PI - 2 * Math.PI * y;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/** The geographic box MapLibre shows at a center and zoom in a panel of this size, at 512-pixel tiles. */
const viewBounds = (
  { lat, lon, zoom }: { lat: number; lon: number; zoom: number },
  { width, height }: { width: number; height: number }
) => {
  const world = 512 * 2 ** zoom;
  const cx = lonToX(lon) * world;
  const cy = latToY(lat) * world;
  return {
    top_left: {
      lat: yToLat(Math.max(0, (cy - height / 2) / world)),
      lon: Math.max(-180, xToLon((cx - width / 2) / world)),
    },
    bottom_right: {
      lat: yToLat(Math.min(1, (cy + height / 2) / world)),
      lon: Math.min(180, xToLon((cx + width / 2) / world)),
    },
  };
};

/**
 * Binds every Maps panel on `dashboardId`, from the export's saved objects (the dashboard, its maps, and their data
 * views), running each layer's search through `search` over `timeRange`.
 */
export const bindMapPanels = async (
  objects: readonly Json[],
  dashboardId: string,
  timeRange: TimeRange | undefined,
  search: ExecuteSearch,
  /** The dashboard's query, filters and controls, for each source that applies the global query. */
  context: DashboardBool = {}
): Promise<BoundPanel[]> => {
  const dashboard = objects.find(({ type, id }) => type === 'dashboard' && id === dashboardId);
  if (!dashboard) {
    return [];
  }
  const bound: BoundPanel[] = [];
  for (const panel of JSON.parse(dashboard.attributes.panelsJSON ?? '[]') as Json[]) {
    if (panel.type !== 'map') {
      continue;
    }
    const panelId: string = panel.panelIndex;
    const reference = (dashboard.references ?? []).find(({ name }: Json) =>
      String(name).startsWith(`${panelId}:`)
    );
    const map = objects.find(({ type, id }) => type === 'map' && id === reference?.id);
    if (!map) {
      continue;
    }
    const title: string = panel.embeddableConfig?.title ?? panel.title ?? map.attributes.title;
    const report = (outcome: PanelOutcome, node?: Json): BoundPanel => ({
      panelId,
      title,
      chartKind: 'map',
      outcome,
      ...(node ? { node } : {}),
    });
    try {
      const mapState = JSON.parse(map.attributes.mapStateJSON ?? '{}');
      // On a dashboard the panel's own view wins over the saved map's.
      const view = panel.embeddableConfig?.mapCenter ?? { ...mapState.center, zoom: mapState.zoom };
      const size = mapChartArea(panel.gridData);
      const bounds = viewBounds(view, size);
      const hidden = new Set<string>(panel.embeddableConfig?.hiddenLayers ?? []);
      const indexOf = (refName: string) => {
        const ref = (map.references ?? []).find(({ name }: Json) => name === refName);
        const dataView = objects.find(({ type, id }) => type === 'index-pattern' && id === ref?.id);
        return {
          index: dataView?.attributes.title as string,
          timeField: dataView?.attributes.timeFieldName as string | undefined,
        };
      };
      // A Maps source applies the global time and query unless its descriptor opts out, as Kibana's ES sources do.
      const scoped = (descriptor: Json, clauses: Json[]) => ({
        bool: {
          filter: [
            ...clauses,
            ...(descriptor.applyGlobalQuery === false ? [] : context.filter ?? []),
          ],
          ...(descriptor.applyGlobalQuery === false
            ? {}
            : {
                must: context.must ?? [],
                should: context.should ?? [],
                must_not: context.must_not ?? [],
              }),
        },
      });
      const timeFilter = (timeField: string | undefined, descriptor: Json = {}) =>
        timeField && timeRange && descriptor.applyGlobalTime !== false
          ? [
              {
                range: {
                  [timeField]: {
                    gte: timeRange.from,
                    lte: timeRange.to,
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ]
          : [];

      const node: Json = {
        id: panelId,
        type: 'map',
        width: size.width,
        height: size.height,
        view: { lat: view.lat, lon: view.lon, zoom: view.zoom },
      };
      const omitted: string[] = [];
      const drawn: string[] = [];
      if (mapState.settings?.projection === 'globeInterpolate' && view.zoom < 6) {
        omitted.push(
          'globe projection: Kibana draws this zoom on a globe; the node draws Web Mercator'
        );
      }
      for (const layer of JSON.parse(map.attributes.layerListJSON ?? '[]') as Json[]) {
        const source = layer.sourceDescriptor ?? {};
        const label = `${layer.type}/${source.type}${
          source.id && source.type === 'EMS_FILE' ? ` ${source.id}` : ''
        }`;
        const visible =
          layer.visible !== false &&
          !hidden.has(layer.id) &&
          view.zoom >= (layer.minZoom ?? 0) &&
          view.zoom < (layer.maxZoom ?? 24);
        if (!visible) {
          continue;
        }
        if (source.type === 'EMS_TMS') {
          omitted.push(
            `${label}: EMS road basemap tiles, not downloaded; country outlines stand in`
          );
          continue;
        }
        if (source.type === 'EMS_FILE') {
          const join = layer.joins?.[0]?.right;
          if (source.id !== 'world_countries') {
            omitted.push(`${label}: no ${source.id} boundaries without downloading the EMS file`);
            continue;
          }
          if (node.regions) {
            omitted.push(`${label}: the node holds one region set`);
            continue;
          }
          if (
            !join ||
            join.type !== 'ES_TERM_SOURCE' ||
            (join.metrics ?? []).some(({ type }: Json) => type !== 'count')
          ) {
            omitted.push(`${label}: only a count joined by term is lowered`);
            continue;
          }
          const { index, timeField } = indexOf(join.indexPatternRefName);
          const body = {
            size: 0,
            query: scoped(join, timeFilter(timeField, join)),
            aggs: { terms: { terms: { field: join.term, size: join.size ?? 65535 } } },
          };
          const buckets = ((await search(index, body)) as Json).aggregations.terms
            .buckets as Json[];
          node.regionSet = 'world_countries';
          node.regions = buckets.map(({ key, doc_count: count }) => ({
            code: String(key),
            value: count,
          }));
          const ramp = RAMPS[layer.style?.properties?.fillColor?.options?.color];
          if (ramp) {
            node.regionRamp = ramp;
          }
          drawn.push(`${label}: ${buckets.length} regions by ${join.term}`);
          continue;
        }
        if (source.type === 'ES_GEO_GRID' && source.requestType === 'point') {
          if (node.markers) {
            omitted.push(`${label}: the node holds one marker layer`);
            continue;
          }
          const { index, timeField } = indexOf(source.indexPatternRefName);
          // Kibana's coarse grid: two geotile levels finer than the rounded-up zoom, inside the visible bounds.
          const precision = Math.min(
            29,
            Math.ceil(view.zoom) +
              (source.resolution === 'FINE' ? 3 : source.resolution === 'MOST_FINE' ? 4 : 2)
          );
          const sums = (source.metrics ?? []).filter(({ type }: Json) => type === 'sum');
          const body = {
            size: 0,
            query: scoped(source, [
              ...timeFilter(timeField, source),
              { geo_bounding_box: { [source.geoField]: bounds } },
            ]),
            aggs: {
              grid: {
                geotile_grid: { field: source.geoField, precision, size: 65535 },
                aggs: {
                  centroid: { geo_centroid: { field: source.geoField } },
                  ...Object.fromEntries(
                    sums.map(({ field }: Json) => [`sum_of_${field}`, { sum: { field } }])
                  ),
                },
              },
            },
          };
          const buckets = ((await search(index, body)) as Json).aggregations.grid.buckets as Json[];
          const props = layer.style?.properties ?? {};
          const metricOf = (bucket: Json, field: string | undefined) =>
            field === 'doc_count' || field === undefined ? bucket.doc_count : bucket[field]?.value;
          const colorField = props.fillColor?.options?.field?.name;
          const sizeField =
            props.iconSize?.type === 'DYNAMIC' ? props.iconSize.options?.field?.name : undefined;
          const labelField =
            props.labelText?.type === 'DYNAMIC' ? props.labelText.options?.field?.name : undefined;
          node.markers = buckets.map((bucket) => ({
            id: bucket.key,
            lat: bucket.centroid.location.lat,
            lon: bucket.centroid.location.lon,
            value: metricOf(bucket, colorField),
            ...(sizeField ? { size: metricOf(bucket, sizeField) } : {}),
            ...(labelField ? { label: String(metricOf(bucket, labelField)) } : {}),
          }));
          const ramp = RAMPS[props.fillColor?.options?.color];
          if (ramp) {
            node.markerRamp = ramp;
          }
          if (props.iconSize?.type === 'DYNAMIC') {
            node.markerSize = {
              min: props.iconSize.options.minSize,
              max: props.iconSize.options.maxSize,
            };
          }
          if (labelField) {
            node.markerLabels = 'inside';
          }
          drawn.push(`${label}: ${buckets.length} clusters at geotile precision ${precision}`);
          continue;
        }
        omitted.push(`${label}: not lowered`);
      }
      bound.push(
        drawn.length === 0
          ? report({ status: 'refused', nodeType: 'map', reasons: omitted })
          : report({ status: 'converted', nodeType: 'map' }, node)
      );
    } catch (error) {
      bound.push(
        report({ status: 'failed', reason: error instanceof Error ? error.message : String(error) })
      );
    }
  }
  return bound;
};
