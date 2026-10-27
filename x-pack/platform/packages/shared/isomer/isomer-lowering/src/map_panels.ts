/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A dashboard's Kibana Maps panels as the maps pack's `map` node. Each visible layer lowers by its source, the way
// Kibana's source class fetches it, into one of the node's stacked layers; a layer the node can't draw faithfully
// refuses the panel by name rather than leaving a map that silently lacks it. Style the node can't match, such as a
// palette it doesn't have, draws with its nearest and says so in the outcome's notes.

import { buildEsQuery, type EsQueryConfig, type Query } from '@kbn/es-query';
import { getNamedParams } from '@kbn/esql-utils';
import {
  MAP_MAX_ARCS,
  MAP_MAX_CELLS,
  MAP_MAX_LAYERS,
  MAP_MAX_MARKERS,
  MAP_MAX_REGIONS,
  type MapBasemap,
  type MapLayer,
  type MapMarker,
  type MapNode,
  type MapRamp,
} from '@kbn/isomer-primitives-maps';

import type { PanelOutcome } from './bind_charts';
import type { TimeRange } from './dashboard';
import { type ExecuteEsql, type ExecuteSearch, formatValue } from './esql_response';
import {
  formatFromRawLensFormat,
  type LensColumnFormat,
} from './kibana/from-saved-object/lens/format_resolver';
import type { DashboardBool } from './vega';
import type { BoundPanel } from './vega_panels';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

/** What a map needs beyond Elasticsearch: Elastic Maps Service boundaries and basemaps. */
export interface MapServices {
  /** Makes an EMS boundary file drawable by its id; false when EMS doesn't have it. */
  loadBoundary?: (id: string) => Promise<boolean>;
  /** An EMS raster basemap for this view, or undefined when EMS doesn't have the style. */
  basemap?: (
    serviceId: string,
    view: { lat: number; lon: number; zoom: number; width: number; height: number }
  ) => Promise<MapBasemap | undefined>;
  /** Kibana's theme, for an auto-selected basemap. */
  darkMode?: boolean;
}

/** The box a panel's content draws in, by panel id; the host's grid decides it. */
export type PanelSize = (panelId: string) => { width: number; height: number } | undefined;

export interface MapLoweringOptions {
  search: ExecuteSearch;
  /** Each panel's body box; without it, Kibana's grid at a 1600-pixel viewport. */
  panelSize?: PanelSize;
  /** Runs an ES|QL layer's statement; without it, ES|QL layers refuse. */
  executeEsql?: ExecuteEsql;
  services?: MapServices;
  esQueryConfig?: Partial<EsQueryConfig>;
}

export interface LoweredMap {
  /** Absent when a layer refused or nothing visible drew. */
  node?: MapNode;
  /** One line per visible layer drawn. */
  drawn: string[];
  /** Why the map can't be drawn faithfully, one line per layer. */
  refused: string[];
  /** Where the drawing approximates Kibana's styling. */
  notes: string[];
}

/** Kibana Maps' ordinal ramps (`color_palettes.ts`) as the maps pack spells them. */
const RAMPS: Record<string, MapRamp> = {
  Blues: 'blues',
  Greens: 'greens',
  Greys: 'greys',
  Reds: 'reds',
  'Yellow to Red': 'yellow_to_red',
  'Green to Red': 'green_to_red',
  'Blue to Red': 'blue_to_red',
};

/** Kibana's `MAX_GEOTILE_LEVEL`, `DEFAULT_MAX_BUCKETS_LIMIT` and default `index.max_result_window`. */
const MAX_GEOTILE_LEVEL = 29;
const MAX_BUCKETS = 65535;
const MAX_RESULT_WINDOW = 10000;

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

interface Extent {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/** The geographic box MapLibre shows at a center and zoom in a panel of this size, at 512-pixel tiles. */
export const viewExtent = (
  { lat, lon, zoom }: { lat: number; lon: number; zoom: number },
  { width, height }: { width: number; height: number }
): Extent => {
  const world = 512 * 2 ** zoom;
  const cx = lonToX(lon) * world;
  const cy = latToY(lat) * world;
  return {
    minLon: Math.max(-180, xToLon((cx - width / 2) / world)),
    maxLon: Math.min(180, xToLon((cx + width / 2) / world)),
    minLat: yToLat(Math.min(1, (cy + height / 2) / world)),
    maxLat: yToLat(Math.max(0, (cy - height / 2) / world)),
  };
};

/** Kibana's `expandToTileBoundaries`: the extent grown to whole geotiles at `precision`. */
const expandToTiles = (extent: Extent, precision: number): Extent => {
  const tiles = 2 ** precision;
  const left = Math.floor(lonToX(extent.minLon) * tiles);
  const right = Math.min(tiles, Math.ceil(lonToX(extent.maxLon) * tiles));
  const top = Math.floor(latToY(extent.maxLat) * tiles);
  const bottom = Math.min(tiles, Math.ceil(latToY(extent.minLat) * tiles));
  return {
    minLon: xToLon(left / tiles),
    maxLon: xToLon(right / tiles),
    maxLat: yToLat(top / tiles),
    minLat: yToLat(bottom / tiles),
  };
};

/** Kibana's `createExtentFilter` as DSL. */
const extentClause = (geoField: string, extent: Extent) => ({
  geo_bounding_box: {
    [geoField]: {
      top_left: { lat: extent.maxLat, lon: extent.minLon },
      bottom_right: { lat: extent.minLat, lon: extent.maxLon },
    },
  },
});

/** Kibana's geo-grid resolution deltas (`_getGeoGridPrecisionResolutionDelta`), for geotile requests. */
const GRID_DELTA: Record<string, number> = { COARSE: 2, FINE: 3, MOST_FINE: 4, SUPER_FINE: 8 };
const gridPrecision = (zoom: number, resolution: string | undefined) =>
  Math.min(Math.ceil(zoom) + (GRID_DELTA[resolution ?? 'COARSE'] ?? 2), MAX_GEOTILE_LEVEL);

/** An ES source's metric as Kibana names, requests and reads it (`get_agg_key.ts`, `percentile_agg_field.ts`). */
interface Metric {
  type: string;
  field?: string;
  percentile?: number;
}
const percentileOf = ({ percentile }: Metric) => percentile ?? 50;
const sourceKey = (metric: Metric) =>
  metric.type === 'count'
    ? 'doc_count'
    : `${metric.type}_of_${metric.field}${
        metric.type === 'percentile' ? `_${percentileOf(metric)}` : ''
      }`;
const joinKey = (metric: Metric, rightSourceId: string) =>
  `__kbnjoin__${
    metric.type === 'count' ? 'count' : `${metric.type}_of_${metric.field}`
  }__${rightSourceId}${metric.type === 'percentile' ? `_${percentileOf(metric)}` : ''}`;
const metricAggs = (metrics: readonly Metric[]): Json =>
  Object.fromEntries(
    metrics
      .filter(({ type }) => type !== 'count')
      .map((metric) => [
        sourceKey(metric),
        metric.type === 'percentile'
          ? { percentiles: { field: metric.field, percents: [percentileOf(metric)] } }
          : { [metric.type]: { field: metric.field } },
      ])
  );
const metricValue = (bucket: Json, metric: Metric): number | undefined => {
  if (metric.type === 'count') return bucket.doc_count;
  const agg = bucket[sourceKey(metric)];
  if (metric.type === 'percentile') {
    const percentile = percentileOf(metric);
    return agg?.values?.[`${percentile}${Number.isInteger(percentile) ? '.0' : ''}`] ?? undefined;
  }
  return typeof agg?.value === 'number' ? agg.value : undefined;
};
const NUMERIC_METRICS = new Set(['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'percentile']);

/** Kibana's EMS_TMS tile choice (`ems_tms_source.ts`): the saved id, unless auto-selected by theme. */
export const basemapId = (source: Json, darkMode = false): string =>
  !source.isAutoSelect && source.id
    ? source.id
    : darkMode
    ? 'dark_map_v9'
    : source.lightModeDefault ?? 'road_map_desaturated_v9';

interface Lowering {
  drawn: string[];
  refused: string[];
  notes: string[];
  layers: MapLayer[];
}

export interface MapDataView {
  index: string;
  timeField?: string;
  fieldFormats?: Record<string, LensColumnFormat>;
}

/** One map's state on a dashboard panel. */
export interface MapPanelState {
  view: { lat: number; lon: number; zoom: number };
  size: { width: number; height: number };
  hiddenLayers?: readonly string[];
}

export interface LowerMapOptions extends MapLoweringOptions, MapPanelState {
  /** The map saved object. */
  map: Json;
  /** A map reference's data view: its title as the index pattern, its time field, and its field formats. */
  dataView: (refName: string) => MapDataView | undefined;
  timeRange?: TimeRange;
  /** The dashboard's query, filters and controls, for each source that applies the global query. */
  context?: DashboardBool;
}

/** Lowers one map: every layer visible at the view drawn, or refused by name. */
export const lowerMap = async ({
  map,
  dataView,
  view,
  size,
  hiddenLayers = [],
  timeRange,
  context = {},
  search,
  executeEsql,
  services = {},
  esQueryConfig,
}: LowerMapOptions): Promise<LoweredMap> => {
  const mapState = JSON.parse(map.attributes.mapStateJSON ?? '{}');
  const extent = viewExtent(view, size);
  const hidden = new Set(hiddenLayers);
  const out: Lowering = { drawn: [], refused: [], notes: [], layers: [] };
  let basemap: MapBasemap | undefined;

  if (mapState.settings?.projection === 'globeInterpolate' && view.zoom < 6) {
    out.notes.push('Kibana draws this zoom on a globe; the map draws it in Web Mercator');
  }

  const sourceQuery = (query: Query | undefined) =>
    query?.query ? [buildEsQuery(undefined, [query], [], esQueryConfig)] : [];
  const hasContext = Object.values(context).some((clauses) => (clauses as unknown[])?.length);
  // Kibana's `makeSearchSource`: the global query and filters unless the source opts out, the global time on the
  // data view's time field unless it opts out, and the layer's own query.
  const query = (
    descriptor: Json,
    timeField: string | undefined,
    clauses: Json[],
    own?: Query
  ) => ({
    bool: {
      filter: [
        ...clauses,
        ...(timeField && timeRange && descriptor.applyGlobalTime !== false
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
          : []),
        ...sourceQuery(own),
        ...(descriptor.applyGlobalQuery !== false && hasContext ? [{ bool: context }] : []),
      ],
    },
  });
  const indexOf = (refName: string | undefined, label: string) => {
    const resolved = refName ? dataView(refName) : undefined;
    if (!resolved?.index) {
      throw new Refusal(`${label}: its data view is not in the export`);
    }
    return resolved;
  };
  const rampOf = (label: string, colorStyle: Json | undefined): MapRamp | undefined => {
    const options = colorStyle?.options ?? {};
    if (colorStyle?.type !== 'DYNAMIC') return undefined;
    if (options.type === 'CATEGORICAL') {
      out.notes.push(`${label}: categorical colors drawn as an ordinal ramp`);
    }
    if (options.useCustomColorRamp) {
      out.notes.push(`${label}: a custom color ramp drawn as Blues`);
      return 'blues';
    }
    const ramp = RAMPS[options.color];
    if (!ramp) {
      out.notes.push(`${label}: the ${options.color ?? 'default'} palette drawn as Blues`);
    }
    return ramp ?? 'blues';
  };
  const staticColor = (colorStyle: Json | undefined) =>
    colorStyle?.type === 'STATIC' && /^#[0-9a-f]{6}$/i.test(colorStyle.options?.color ?? '')
      ? (colorStyle.options.color as string)
      : undefined;

  // Kibana's field formatters: a data view field's own, else `format:number:defaultPattern` (0,0.[000]).
  const formatField = (
    formats: MapDataView['fieldFormats'],
    field: string | undefined,
    value: unknown
  ): string => {
    if (typeof value !== 'number') return String(value);
    const format = field ? formatFromRawLensFormat(formats?.[field]) : undefined;
    return format
      ? String(formatValue(value, format))
      : new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);
  };
  // An aggregate formats as its source field does, except counts (`ESAggField.getFormatter`).
  const formatMetric = (formats: MapDataView['fieldFormats'], metric: Metric, value: unknown) =>
    formatField(
      formats,
      metric.type === 'count' || metric.type === 'cardinality' ? undefined : metric.field,
      value
    );

  const layerList = JSON.parse(map.attributes.layerListJSON ?? '[]') as Json[];
  for (const layer of layerList) {
    const source: Json = layer.sourceDescriptor ?? {};
    const label = `${layer.label ?? layer.id ?? 'layer'} (${layer.type}/${source.type}${
      source.type === 'EMS_FILE' && source.id ? ` ${source.id}` : ''
    })`;
    // Kibana's `showAtZoomLevel`.
    const visible =
      layer.visible !== false &&
      !hidden.has(layer.id) &&
      view.zoom >= (layer.minZoom ?? 0) &&
      view.zoom <= (layer.maxZoom ?? 24);
    if (!visible) continue;
    try {
      const props: Json = layer.style?.properties ?? {};
      const before = out.layers.length;
      const color = staticColor(props.fillColor);
      switch (source.type) {
        case 'EMS_TMS': {
          if (basemap) throw new Refusal(`${label}: a second basemap over the first`);
          const id = basemapId(source, services.darkMode);
          const tiles = services.basemap
            ? await services.basemap(id, { ...view, ...size })
            : undefined;
          if (!tiles) {
            out.notes.push(
              `${label}: the ${id} basemap is ${
                services.basemap ? 'not in EMS' : 'not available'
              }; country outlines stand in`
            );
            continue;
          }
          basemap = tiles;
          out.drawn.push(`${label}: EMS ${id}`);
          continue;
        }
        case 'EMS_FILE':
          await lowerRegions(layer, source, label, color);
          break;
        case 'ES_GEO_GRID':
          await lowerGrid(layer, source, label, color);
          break;
        case 'ES_PEW_PEW':
          await lowerPewPew(layer, source, label, color);
          break;
        case 'ES_SEARCH':
          await lowerDocuments(layer, source, label, color);
          break;
        case 'ESQL':
          await lowerEsql(layer, source, label, color);
          break;
        default:
          throw new Refusal(`${label}: no lowering for a ${source.type ?? 'missing'} source`);
      }
      // Kibana paints a vector layer at its `alpha` (`Layer.getAlpha`, default 1), with its style's line and labels.
      const opacity = typeof layer.alpha === 'number' ? layer.alpha : 1;
      for (const added of out.layers.slice(before)) {
        added.opacity = opacity;
        applyStyle(added, props, label);
      }
    } catch (error) {
      if (error instanceof Refusal) {
        out.refused.push(error.message);
        continue;
      }
      throw error;
    }
  }

  if (out.layers.length > MAP_MAX_LAYERS) {
    out.refused.push(`${out.layers.length} data layers exceed the ${MAP_MAX_LAYERS} a map draws`);
  }
  if (out.refused.length > 0 || out.drawn.length === 0) {
    return { drawn: out.drawn, refused: out.refused, notes: out.notes };
  }
  return {
    node: {
      id: '',
      type: 'map',
      width: size.width,
      height: size.height,
      view: { lat: view.lat, lon: view.lon, zoom: view.zoom },
      ...(out.layers.length ? { layers: out.layers } : {}),
      ...(basemap ? { basemap } : {}),
    } as MapNode,
    drawn: out.drawn,
    refused: [],
    notes: out.notes,
  };

  // An EMS boundary file colored by its term join, as Kibana's GeoJSON vector layer with an ES term join.
  async function lowerRegions(layer: Json, source: Json, label: string, color?: string) {
    const joins = (layer.joins ?? []) as Json[];
    if (joins.length === 0) {
      throw new Refusal(`${label}: boundaries without a join draw no data`);
    }
    if (joins.length > 1) {
      throw new Refusal(
        `${label}: ${joins.length} joins; a feature's visibility depends on all of them`
      );
    }
    const [{ leftField, right }] = joins;
    // Saved objects from before 7.x term joins carry no type (`add_type_to_termjoin.ts`).
    if ((right?.type ?? 'ES_TERM_SOURCE') !== 'ES_TERM_SOURCE') {
      throw new Refusal(`${label}: a ${right?.type} join`);
    }
    if (!services.loadBoundary || !(await services.loadBoundary(source.id))) {
      throw new Refusal(`${label}: the ${source.id} boundaries are not in EMS`);
    }
    const metrics: Metric[] = right.metrics?.length ? right.metrics : [{ type: 'count' }];
    const fillField = props(layer).fillColor?.options?.field?.name;
    const metric =
      metrics.find((candidate) => joinKey(candidate, right.id) === fillField) ?? metrics[0];
    if (!NUMERIC_METRICS.has(metric.type)) {
      throw new Refusal(`${label}: a ${metric.type} metric colors no ramp`);
    }
    const { index, timeField } = indexOf(right.indexPatternRefName, label);
    const response = (await search(index, {
      size: 0,
      track_total_hits: false,
      query: query(right, timeField, [], right.whereQuery),
      aggs: {
        join: {
          terms: { field: right.term, size: right.size ?? MAX_BUCKETS, shard_size: MAX_BUCKETS },
          aggs: metricAggs([metric]),
        },
      },
    })) as Json;
    const buckets = (response.aggregations?.join?.buckets ?? []) as Json[];
    if (buckets.length > MAP_MAX_REGIONS) {
      throw new Refusal(
        `${label}: ${buckets.length} joined regions exceed the ${MAP_MAX_REGIONS} a map draws`
      );
    }
    const regions = buckets.flatMap((bucket) => {
      const value = metricValue(bucket, metric);
      return value === undefined ? [] : [{ code: String(bucket.key), value }];
    });
    const ramp = rampOf(label, props(layer).fillColor);
    out.layers.push({
      kind: 'regions',
      regionSet: source.id,
      regionKey: leftField,
      regions,
      ...(ramp ? { regionRamp: ramp } : {}),
      ...(color ? { color } : {}),
    });
    out.drawn.push(`${label}: ${regions.length} regions by ${right.term}, ${sourceKey(metric)}`);
  }

  // Kibana's `ESGeoGridSource`: geotile buckets in view, as cluster points, grid cells or a heatmap.
  async function lowerGrid(layer: Json, source: Json, label: string, color?: string) {
    const requestType = source.requestType ?? 'point';
    if (requestType === 'hex') {
      throw new Refusal(`${label}: H3 hexagons; the map draws geotile cells`);
    }
    const metrics: Metric[] = source.metrics?.length ? source.metrics : [{ type: 'count' }];
    const unusable = metrics.find(({ type }) => !NUMERIC_METRICS.has(type));
    if (unusable) {
      throw new Refusal(`${label}: a ${unusable.type} metric`);
    }
    const { index, timeField, fieldFormats } = indexOf(source.indexPatternRefName, label);
    const precision = gridPrecision(view.zoom, source.resolution);
    const response = (await search(index, {
      size: 0,
      track_total_hits: false,
      query: query(
        source,
        timeField,
        [extentClause(source.geoField, expandToTiles(extent, precision))],
        layer.query
      ),
      aggs: {
        grid: {
          geotile_grid: { field: source.geoField, precision, size: MAX_BUCKETS },
          aggs: {
            ...(requestType === 'point'
              ? { centroid: { geo_centroid: { field: source.geoField } } }
              : {}),
            ...metricAggs(metrics),
          },
        },
      },
    })) as Json;
    const buckets = (response.aggregations?.grid?.buckets ?? []) as Json[];
    const metricFor = (fieldName: string | undefined) =>
      metrics.find((metric) => sourceKey(metric) === fieldName) ?? metrics[0];
    const style = props(layer);
    if (requestType === 'point') {
      pushMarkers(
        label,
        buckets.map((bucket) => ({
          bucket,
          lat: bucket.centroid?.location?.lat,
          lon: bucket.centroid?.location?.lon,
          id: String(bucket.key),
        })),
        (bucket, name) => metricValue(bucket, metricFor(name)),
        (name, value) => formatMetric(fieldFormats, metricFor(name), value),
        style,
        color,
        `clusters at geotile precision ${precision}`
      );
      return;
    }
    if (buckets.length > MAP_MAX_CELLS) {
      throw new Refusal(
        `${label}: ${buckets.length} cells exceed the ${MAP_MAX_CELLS} a map draws`
      );
    }
    // A heatmap weighs by its first metric; a grid colors by its fill field's.
    const metric =
      requestType === 'heatmap' ? metrics[0] : metricFor(style.fillColor?.options?.field?.name);
    const cells = buckets.flatMap((bucket) => {
      const value = metricValue(bucket, metric);
      return value === undefined ? [] : [{ key: String(bucket.key), value }];
    });
    const ramp =
      requestType === 'heatmap'
        ? heatmapRamp(label, layer.style?.colorRampName)
        : rampOf(label, style.fillColor);
    out.layers.push({
      kind: 'cells',
      cellShape: requestType === 'heatmap' ? 'heatmap' : 'grid',
      cells,
      ...(ramp ? { cellRamp: ramp } : {}),
      ...(color ? { color } : {}),
    });
    out.drawn.push(
      `${label}: ${cells.length} ${requestType} cells at geotile precision ${precision}`
    );
  }

  // Kibana's `ESPewPewSource`: the top destinations, each split into source geotiles at their centroids.
  async function lowerPewPew(layer: Json, source: Json, label: string, color?: string) {
    const metrics: Metric[] = source.metrics?.length ? source.metrics : [{ type: 'count' }];
    const { index, timeField } = indexOf(source.indexPatternRefName, label);
    const precision = Math.min(Math.ceil(view.zoom) + 2, MAX_GEOTILE_LEVEL);
    const response = (await search(index, {
      size: 0,
      track_total_hits: false,
      query: query(
        source,
        timeField,
        [extentClause(source.destGeoField, extent), { exists: { field: source.sourceGeoField } }],
        layer.query
      ),
      aggs: {
        destSplit: {
          terms: {
            script: { source: `doc['${source.destGeoField}'].value.toString()`, lang: 'painless' },
            order: { _count: 'desc' },
            size: 100,
          },
          aggs: {
            sourceGrid: {
              geotile_grid: { field: source.sourceGeoField, precision, size: 500 },
              aggs: {
                sourceCentroid: { geo_centroid: { field: source.sourceGeoField } },
                ...metricAggs(metrics),
              },
            },
          },
        },
      },
    })) as Json;
    const widthField =
      props(layer).lineWidth?.type === 'DYNAMIC'
        ? props(layer).lineWidth.options?.field?.name
        : undefined;
    const weightMetric = metrics.find((metric) => sourceKey(metric) === widthField);
    const arcs = ((response.aggregations?.destSplit?.buckets ?? []) as Json[]).flatMap((dest) => {
      // `convert_to_lines.ts`: the key is the destination point as "lat, lon".
      const [toLat, toLon] = String(dest.key)
        .split(',')
        .map((part) => parseFloat(part));
      return ((dest.sourceGrid?.buckets ?? []) as Json[]).map((bucket) => ({
        from: [bucket.sourceCentroid.location.lat, bucket.sourceCentroid.location.lon] as [
          number,
          number
        ],
        to: [toLat, toLon] as [number, number],
        ...(weightMetric ? { weight: metricValue(bucket, weightMetric) ?? 1 } : {}),
      }));
    });
    if (arcs.length > MAP_MAX_ARCS) {
      throw new Refusal(
        `${label}: ${arcs.length} source-destination pairs exceed the ${MAP_MAX_ARCS} arcs a map draws`
      );
    }
    const lineColor = staticColor(props(layer).lineColor) ?? color;
    out.layers.push({ kind: 'arcs', arcs, ...(lineColor ? { color: lineColor } : {}) });
    out.drawn.push(`${label}: ${arcs.length} arcs at geotile precision ${precision}`);
  }

  // Kibana's `ESSearchSource` by scaling type: documents, top hits per entity, or clusters past the result window.
  async function lowerDocuments(layer: Json, source: Json, label: string, color?: string) {
    const scaling = source.scalingType ?? 'LIMIT';
    if ((layer.joins ?? []).length > 0) {
      throw new Refusal(`${label}: documents with a join`);
    }
    const { index, timeField, fieldFormats } = indexOf(source.indexPatternRefName, label);
    const style = props(layer);
    const styleFields = [style.fillColor, style.iconSize, style.labelText]
      .filter((property) => property?.type === 'DYNAMIC')
      .map((property) => property.options?.field?.name)
      .filter((name): name is string => Boolean(name));
    const bounded = source.filterByMapBounds !== false;
    const filtered = query(
      source,
      timeField,
      bounded ? [extentClause(source.geoField, extent)] : [],
      layer.query
    );
    const sort = source.sortField
      ? [{ [source.sortField]: { order: source.sortOrder ?? 'desc' } }]
      : undefined;
    const fields = [source.geoField, ...styleFields].map((field) => ({ field }));

    if (scaling === 'TOP_HITS') {
      const response = (await search(index, {
        size: 0,
        track_total_hits: false,
        query: filtered,
        aggs: {
          entitySplit: {
            terms: { field: source.topHitsSplitField, size: MAX_BUCKETS, shard_size: MAX_BUCKETS },
            aggs: {
              entityHits: {
                top_hits: {
                  size: source.topHitsSize ?? 1,
                  _source: false,
                  fields,
                  ...(sort ? { sort } : {}),
                },
              },
            },
          },
        },
      })) as Json;
      const hits = ((response.aggregations?.entitySplit?.buckets ?? []) as Json[]).flatMap(
        (bucket) => bucket.entityHits?.hits?.hits ?? []
      );
      pushDocuments(label, source, hits, style, color, 'top hits', fieldFormats);
      return;
    }

    const counted = (await search(index, {
      size: 0,
      track_total_hits: MAX_RESULT_WINDOW + 1,
      query: filtered,
    })) as Json;
    const total = Number(counted.hits?.total?.value ?? counted.hits?.total ?? 0);
    if (scaling === 'CLUSTERS' && total > MAX_RESULT_WINDOW) {
      // `blended_vector_layer.ts`: past the result window, coarse geo-grid clusters with the style's metrics.
      await lowerGrid(
        layer,
        {
          ...source,
          type: 'ES_GEO_GRID',
          requestType: 'point',
          resolution: 'COARSE',
          metrics: [{ type: 'count' }],
        },
        label,
        color
      );
      return;
    }
    if (total > MAP_MAX_MARKERS) {
      throw new Refusal(
        `${label}: ${
          total > MAX_RESULT_WINDOW ? `over ${MAX_RESULT_WINDOW}` : total
        } documents exceed the ${MAP_MAX_MARKERS} markers a map draws`
      );
    }
    const response = (await search(index, {
      size: MAP_MAX_MARKERS,
      track_total_hits: false,
      _source: false,
      fields,
      query: filtered,
      ...(sort ? { sort } : {}),
    })) as Json;
    pushDocuments(
      label,
      source,
      response.hits?.hits ?? [],
      style,
      color,
      'documents',
      fieldFormats
    );
  }

  // Kibana's `ESQLSource`: the statement narrowed by the global search, time and map bounds, its geometry column as WKT.
  async function lowerEsql(layer: Json, source: Json, label: string, color?: string) {
    if (!executeEsql) {
      throw new Refusal(`${label}: ES|QL layers need an ES|QL executor`);
    }
    const narrowByGlobalSearch = source.narrowByGlobalSearch ?? true;
    const narrowByGlobalTime = source.narrowByGlobalTime ?? source.dateField !== undefined;
    const narrowByMapBounds = source.narrowByMapBounds ?? source.geoField !== undefined;
    const filters: Json[] = [];
    if (narrowByMapBounds && source.geoField) filters.push(extentClause(source.geoField, extent));
    if (narrowByGlobalTime && source.dateField && timeRange) {
      filters.push({
        range: {
          [source.dateField]: {
            gte: timeRange.from,
            lte: timeRange.to,
            format: 'strict_date_optional_time',
          },
        },
      });
    }
    if (narrowByGlobalSearch && hasContext) filters.push({ bool: context });
    const params = timeRange ? getNamedParams(source.esql, timeRange) : [];
    const response = await executeEsql(source.esql, {
      ...(filters.length ? { filter: { bool: { filter: filters } } } : {}),
      ...(params.length ? { params: params as Array<Record<string, unknown>> } : {}),
    });
    // `convert_to_geojson.ts`: the first geometry column.
    const geometry = response.columns.findIndex(({ type }) =>
      ['geo_point', 'geo_shape', 'cartesian_point', 'cartesian_shape'].includes(type)
    );
    if (geometry < 0) {
      throw new Refusal(`${label}: the statement returns no geometry column`);
    }
    if (response.values.length > MAP_MAX_MARKERS) {
      throw new Refusal(
        `${label}: ${response.values.length} rows exceed the ${MAP_MAX_MARKERS} markers a map draws`
      );
    }
    const style = props(layer);
    const columnOf = (name: string | undefined) =>
      name === undefined ? -1 : response.columns.findIndex((column) => column.name === name);
    const markers = response.values.flatMap((row, rowIndex): MapMarker[] => {
      const point = parseWktPoint(row[geometry]);
      if (point === null) {
        throw new Refusal(`${label}: a ${response.columns[geometry].type} that isn't a point`);
      }
      if (!point) return [];
      return [
        styledMarker(
          `${rowIndex}`,
          point,
          style,
          (name) => row[columnOf(name)],
          (_name, value) => formatField(undefined, undefined, value)
        ),
      ];
    });
    pushMarkerLayer(label, markers, style, color, 'rows');
  }

  function pushDocuments(
    label: string,
    source: Json,
    hits: Json[],
    style: Json,
    color: string | undefined,
    what: string,
    fieldFormats: MapDataView['fieldFormats']
  ) {
    if (hits.length > MAP_MAX_MARKERS) {
      throw new Refusal(
        `${label}: ${hits.length} ${what} exceed the ${MAP_MAX_MARKERS} markers a map draws`
      );
    }
    const markers = hits.flatMap((hit): MapMarker[] =>
      ((hit.fields?.[source.geoField] ?? []) as Json[]).map((geometry, valueIndex) => {
        if (geometry?.type !== 'Point') {
          throw new Refusal(
            `${label}: ${geometry?.type ?? 'unknown'} geometry; the map draws points`
          );
        }
        const [lon, lat] = geometry.coordinates;
        return styledMarker(
          `${hit._id}:${valueIndex}`,
          { lat, lon },
          style,
          (name) => (name ? hit.fields?.[name]?.[0] : undefined),
          (name, value) => formatField(fieldFormats, name, value)
        );
      })
    );
    pushMarkerLayer(label, markers, style, color, what);
  }

  function pushMarkers(
    label: string,
    points: Array<{ bucket: Json; lat: number; lon: number; id: string }>,
    valueOf: (bucket: Json, fieldName: string | undefined) => number | undefined,
    labelOf: (fieldName: string, value: unknown) => string,
    style: Json,
    color: string | undefined,
    what: string
  ) {
    if (points.length > MAP_MAX_MARKERS) {
      throw new Refusal(
        `${label}: ${points.length} clusters exceed the ${MAP_MAX_MARKERS} markers a map draws`
      );
    }
    const markers = points.map(({ bucket, lat, lon, id }) =>
      styledMarker(id, { lat, lon }, style, (name) => valueOf(bucket, name), labelOf)
    );
    pushMarkerLayer(label, markers, style, color, what);
  }

  function pushMarkerLayer(
    label: string,
    markers: MapMarker[],
    style: Json,
    color: string | undefined,
    what: string
  ) {
    const ramp = rampOf(label, style.fillColor);
    out.layers.push({
      kind: 'markers',
      markers,
      ...(ramp ? { markerRamp: ramp } : {}),
      ...(style.iconSize?.type === 'DYNAMIC'
        ? {
            markerSize: {
              min: style.iconSize.options.minSize,
              max: style.iconSize.options.maxSize,
            },
          }
        : {}),
      ...(style.labelText?.type === 'DYNAMIC' ? { markerLabels: 'inside' as const } : {}),
      ...(color ? { color } : {}),
    });
    out.drawn.push(`${label}: ${markers.length} ${what}`);
  }

  // A vector style's line, icon and label properties (`VectorStyle`), as far as a static map draws them.
  function applyStyle(added: MapLayer, style: Json, label: string) {
    const note = (text: string) => out.notes.push(`${label}: ${text}`);
    const lineColor = staticColor(style.lineColor);
    if (lineColor) added.lineColor = lineColor;
    else if (style.lineColor?.type === 'DYNAMIC')
      note('a line colored by value draws in the default outline');
    if (style.lineWidth?.type === 'STATIC' && typeof style.lineWidth.options?.size === 'number') {
      added.lineWidth = style.lineWidth.options.size;
    } else if (style.lineWidth?.type === 'DYNAMIC' && added.kind !== 'arcs') {
      note('a line width by value draws at the default width');
    }
    if (added.kind !== 'markers') return;
    if (style.symbolizeAs?.options?.value === 'icon') {
      note(`the ${style.icon?.options?.value ?? 'marker'} icon draws as a circle`);
    }
    if (
      style.iconSize?.type === 'STATIC' &&
      typeof style.iconSize.options?.size === 'number' &&
      !added.markerSize
    ) {
      const radius = style.iconSize.options.size as number;
      added.markerSize = { min: radius, max: radius };
    }
    const labelColor = staticColor(style.labelColor);
    if (labelColor) added.labelColor = labelColor;
    if (style.labelSize?.type === 'STATIC' && typeof style.labelSize.options?.size === 'number') {
      added.labelSize = style.labelSize.options.size;
    } else if (style.labelSize?.type === 'DYNAMIC') {
      note('a label size by value draws at the default size');
    }
    const staticText =
      style.labelText?.type === 'STATIC' ? String(style.labelText.options?.value ?? '') : '';
    if (staticText) {
      added.markers = added.markers.map((marker) => ({
        ...marker,
        label: staticText.slice(0, 80),
      }));
    }
    const position = style.labelPosition?.options?.position;
    if (position === 'TOP' || position === 'BOTTOM') {
      note(`labels ${position.toLowerCase()} of markers draw beside them`);
      delete added.markerLabels;
    } else if (staticText || style.labelText?.type === 'DYNAMIC') {
      added.markerLabels = 'inside';
    }
    if (style.labelBorderSize?.options?.size && style.labelBorderSize.options.size !== 'NONE') {
      const hasLabels = added.markers.some((marker) => marker.label);
      if (hasLabels) note('label halos are not drawn');
    }
    // `labelZoomRange`: labels show between its zooms, or the layer's.
    const range = style.labelZoomRange?.options;
    if (
      range &&
      range.useLayerZoomRange === false &&
      (view.zoom < range.minZoom || view.zoom > range.maxZoom)
    ) {
      added.markers = added.markers.map(({ label: _label, ...marker }) => marker);
      delete added.markerLabels;
    }
  }

  function heatmapRamp(label: string, name: string | undefined): MapRamp {
    const ramp = name ? RAMPS[name] : undefined;
    if (!ramp)
      out.notes.push(
        `${label}: the ${name ?? 'theclassic'} heatmap palette drawn as Yellow to Red`
      );
    return ramp ?? 'yellow_to_red';
  }
};

class Refusal extends Error {}

const props = (layer: Json): Json => layer.style?.properties ?? {};

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** A marker styled as Kibana's vector style reads its dynamic fields. */
const styledMarker = (
  id: string,
  { lat, lon }: { lat: number; lon: number },
  style: Json,
  valueOf: (fieldName: string | undefined) => unknown,
  labelOf: (fieldName: string, value: unknown) => string = (_name, value) => String(value)
): MapMarker => {
  const dynamic = (property: Json | undefined) =>
    property?.type === 'DYNAMIC' ? valueOf(property.options?.field?.name) : undefined;
  const value = asNumber(dynamic(style.fillColor));
  const size = asNumber(dynamic(style.iconSize));
  const labelField: string | undefined = style.labelText?.options?.field?.name;
  const label = labelField ? dynamic(style.labelText) : undefined;
  return {
    id,
    lat,
    lon,
    ...(value !== undefined ? { value } : {}),
    ...(size !== undefined ? { size } : {}),
    ...(labelField && label !== undefined && label !== null
      ? { label: labelOf(labelField, label).slice(0, 80) }
      : {}),
  };
};

/** A WKT `POINT (lon lat)`; null for any other geometry, undefined for none. */
const parseWktPoint = (value: unknown): { lat: number; lon: number } | null | undefined => {
  if (value === null || value === undefined) return undefined;
  const match = /^\s*POINT\s*\(\s*(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s*\)\s*$/i.exec(String(value));
  return match ? { lon: parseFloat(match[1]), lat: parseFloat(match[2]) } : null;
};

/**
 * Binds every Maps panel on `dashboardId`, from the export's saved objects (the dashboard, its maps, and their data
 * views), running each layer's search as the caller over `timeRange`.
 */
export const bindMapPanels = async (
  objects: readonly Json[],
  dashboardId: string,
  timeRange: TimeRange | undefined,
  /** The dashboard's query, filters and controls, for each source that applies the global query. */
  context: DashboardBool,
  options: MapLoweringOptions
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
      const lowered = await lowerMap({
        ...options,
        map,
        view,
        size: options.panelSize?.(panelId) ?? mapChartArea(panel.gridData),
        hiddenLayers: panel.embeddableConfig?.hiddenLayers ?? [],
        ...(timeRange ? { timeRange } : {}),
        context,
        dataView: dataViewResolver(objects, map),
      });
      bound.push(
        lowered.node
          ? report(
              {
                status: 'converted',
                nodeType: 'map',
                ...(lowered.notes.length ? { notes: lowered.notes } : {}),
              },
              { ...lowered.node, id: panelId }
            )
          : report({
              status: 'refused',
              nodeType: 'map',
              reasons: lowered.refused.length ? lowered.refused : ['no visible layer draws'],
            })
      );
    } catch (error) {
      bound.push(
        report({ status: 'failed', reason: error instanceof Error ? error.message : String(error) })
      );
    }
  }
  return bound;
};

/** A map's data views by reference name, from the export's `index-pattern` objects. */
export const dataViewResolver =
  (objects: readonly Json[], map: Json) =>
  (refName: string): MapDataView | undefined => {
    const ref = (map.references ?? []).find(({ name }: Json) => name === refName);
    const dataView = objects.find(({ type, id }) => type === 'index-pattern' && id === ref?.id);
    return dataView
      ? {
          index: dataView.attributes.title as string,
          ...(dataView.attributes.timeFieldName
            ? { timeField: dataView.attributes.timeFieldName as string }
            : {}),
          ...(dataView.attributes.fieldFormatMap
            ? { fieldFormats: JSON.parse(dataView.attributes.fieldFormatMap) }
            : {}),
        }
      : undefined;
  };
