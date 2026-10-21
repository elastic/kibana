/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana's Vega map mode (`config.kibana.type: "map"`) as plain Vega over a basemap, following the contract
// `vis_types/vega` keeps with its specs: `_parseMapConfig` and `validateZoomSettings` read the view, the Vega-Lite
// compiler's projection goes unless the spec configures one, `injectMapPropsIntoSpec` adds the `zoom`, `latitude`
// and `longitude` signals and the Web Mercator `projection` a spec doesn't define, and the map sets those signals.
// The basemap is the one Kibana's map view loads, as tiles the node draws beneath the chart.

import { compile, type TopLevelSpec } from 'vega-lite';
import type { MapBasemap } from '@kbn/isomer-primitives-maps';

import { basemapId } from './map_panels';
import type { VegaMode, VegaSpec } from './vega';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Kibana's `defaultMapConfig` zoom limits. */
const ZOOM_LIMITS = { minZoom: 0, maxZoom: 20 };
const DEFAULT_ZOOM = 3;

/** Kibana's `defaultProjection` (`vega_map_view/constants.ts`): MapLibre's 512-pixel Web Mercator. */
export const KIBANA_MAP_PROJECTION = {
  name: 'projection',
  type: 'mercator',
  scale: { signal: '512*pow(2,zoom)/2/PI' },
  rotate: [{ signal: '-longitude' }, 0, 0],
  center: [0, { signal: 'latitude' }],
  translate: [{ signal: 'width/2' }, { signal: 'height/2' }],
  fit: false,
} as const;

/** A spec's Kibana settings: `config.kibana`, or the deprecated `_hostConfig` (`VegaParser._parseConfig`). */
export const kibanaConfigOf = (spec: VegaSpec): Record<string, unknown> | undefined => {
  if (isObject(spec.config) && isObject(spec.config.kibana)) {
    return spec.config.kibana;
  }
  return isObject(spec._hostConfig) ? spec._hostConfig : undefined;
};

/** Whether Kibana draws `spec` in map mode. */
export const isKibanaMap = (spec: VegaSpec): boolean => kibanaConfigOf(spec)?.type === 'map';

export interface KibanaMapView {
  latitude: number;
  longitude: number;
  zoom: number;
  /** False draws no basemap. */
  mapStyle: boolean;
  /** The EMS style the spec names; otherwise Kibana's default for the theme. */
  emsTileServiceId?: string;
}

/** `VegaParser._parseMapConfig` then `validateZoomSettings`: what Kibana's map shows, and what it warned about. */
export const parseKibanaMapView = (
  kibana: Record<string, unknown>
): { view: KibanaMapView; warnings: string[] } => {
  const warnings: string[] = [];
  const number = (name: string, isZoom: boolean): number | undefined => {
    const raw = kibana[name];
    if (raw === undefined) {
      return isZoom ? undefined : 0;
    }
    const parsed = parseFloat(String(raw));
    if (Number.isFinite(parsed) && (!isZoom || (parsed >= 0 && parsed <= 30))) {
      return parsed;
    }
    warnings.push(`config.kibana.${name} is not valid`);
    return isZoom ? undefined : 0;
  };
  const clamp = (
    name: string,
    value: number | undefined,
    fallback: number,
    min: number,
    max: number
  ) => {
    if (value === undefined) return fallback;
    if (value < min) {
      warnings.push(`Resetting "${name}" to ${min}`);
      return min;
    }
    if (value > max) {
      warnings.push(`Resetting "${name}" to ${max}`);
      return max;
    }
    return value;
  };
  const latitude = number('latitude', false) ?? 0;
  const longitude = number('longitude', false) ?? 0;
  let minZoom = clamp(
    'minZoom',
    number('minZoom', true),
    ZOOM_LIMITS.minZoom,
    ZOOM_LIMITS.minZoom,
    ZOOM_LIMITS.maxZoom
  );
  let maxZoom = clamp(
    'maxZoom',
    number('maxZoom', true),
    ZOOM_LIMITS.maxZoom,
    ZOOM_LIMITS.minZoom,
    ZOOM_LIMITS.maxZoom
  );
  if (minZoom > maxZoom) {
    warnings.push('"minZoom" and "maxZoom" have been swapped');
    [minZoom, maxZoom] = [maxZoom, minZoom];
  }
  const zoom = clamp('zoom', number('zoom', true), DEFAULT_ZOOM, minZoom, maxZoom);
  let mapStyle = true;
  if (kibana.mapStyle !== undefined) {
    if (typeof kibana.mapStyle === 'boolean') {
      mapStyle = kibana.mapStyle;
    } else {
      warnings.push('config.kibana.mapStyle must be a boolean value');
    }
  }
  const emsTileServiceId =
    mapStyle && typeof kibana.emsTileServiceId === 'string' ? kibana.emsTileServiceId : undefined;
  return {
    view: {
      latitude,
      longitude,
      zoom,
      mapStyle,
      ...(emsTileServiceId ? { emsTileServiceId } : {}),
    },
    warnings,
  };
};

/** The EMS style Kibana's map view loads: the spec's, else the theme's default (`getDefaultTmsLayer`). */
export const kibanaMapStyle = (view: KibanaMapView, darkMode = false): string | undefined =>
  view.mapStyle ? view.emsTileServiceId ?? basemapId({ isAutoSelect: true }, darkMode) : undefined;

/**
 * A map-mode spec, its `config.kibana` already gone, as the plain Vega Kibana runs over its map: Vega-Lite compiled
 * with the generated projection removed, the map's signals and projection injected, and the view sized to the panel.
 */
export const lowerKibanaMapSpec = (
  { mode, spec }: { mode: VegaMode; spec: VegaSpec },
  view: KibanaMapView,
  { width, height }: { width: number; height: number }
): VegaSpec => {
  const vega = mode === 'vega-lite' ? compileForMap(spec) : structuredClone(spec);
  // `injectMapPropsIntoSpec`: autosize off, then what the spec doesn't define.
  vega.autosize = 'none';
  const signals = (Array.isArray(vega.signals) ? vega.signals : []) as Array<
    Record<string, unknown>
  >;
  const values: Record<string, number> = {
    zoom: view.zoom,
    latitude: view.latitude,
    longitude: view.longitude,
  };
  for (const name of Object.keys(values)) {
    if (!signals.some((signal) => signal.name === name)) signals.push({ name });
  }
  // The map sets these on the view after it starts, over any value or update the spec gives them.
  vega.signals = signals.map((signal) => {
    if (typeof signal.name !== 'string' || !(signal.name in values)) return signal;
    const { update: _update, init: _init, ...rest } = signal;
    return { ...rest, value: values[signal.name] };
  });
  const projections = (Array.isArray(vega.projections) ? vega.projections : []) as Array<
    Record<string, unknown>
  >;
  if (!projections.some((projection) => projection.name === KIBANA_MAP_PROJECTION.name)) {
    projections.push(structuredClone(KIBANA_MAP_PROJECTION) as unknown as Record<string, unknown>);
  }
  vega.projections = projections;
  vega.width = width;
  vega.height = height;
  // Vega's own default, under any padding a theme's config would add, so the chart's frame is the map's.
  if (vega.padding === undefined) vega.padding = 0;
  // The map shows through wherever the chart draws nothing.
  if (vega.background === undefined) vega.background = 'transparent';
  return vega;
};

/** `VegaParser._compileVegaLite` with a map: the compiler's projection goes unless the spec configures one. */
const compileForMap = (vlspec: VegaSpec): VegaSpec => {
  const vega = compile(structuredClone(vlspec) as unknown as TopLevelSpec)
    .spec as unknown as VegaSpec;
  const config = vlspec.config;
  if (config === undefined || (isObject(config) && !config.projection)) {
    const projections = vega.projections;
    if (
      !Array.isArray(projections) ||
      projections.length !== 1 ||
      (projections[0] as { name?: string }).name !== 'projection'
    ) {
      throw new Error('Vega-Lite compiler should have generated a single projection object');
    }
    delete vega.projections;
  }
  if (!vlspec.width) delete vega.width;
  if (!vlspec.height) delete vega.height;
  if (!vlspec.padding && (config === undefined || (isObject(config) && !config.padding))) {
    delete vega.padding;
  }
  if (!vlspec.autosize && (config === undefined || (isObject(config) && !config.autosize))) {
    delete vega.autosize;
  }
  return vega;
};

/** A raster basemap's tiles in the chart's pixel frame, at MapLibre's 512-pixel Web Mercator. */
export const basemapTiles = (
  basemap: MapBasemap,
  view: Pick<KibanaMapView, 'latitude' | 'longitude' | 'zoom'>,
  { width, height }: { width: number; height: number }
): Array<{ src: string; x: number; y: number; width: number; height: number }> => {
  const { tiles = [], zoom, originX = 0, originY = 0 } = basemap;
  if (zoom === undefined) return [];
  const world = 512 * 2 ** view.zoom;
  const lat = (Math.max(-85.05112878, Math.min(85.05112878, view.latitude)) * Math.PI) / 180;
  const centerX = ((view.longitude + 180) / 360) * world;
  const centerY = ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * world;
  const side = world / 2 ** zoom;
  return tiles.map(({ col, row, src }) => ({
    src,
    x: (originX + col) * side - centerX + width / 2,
    y: (originY + row) * side - centerY + height / 2,
    width: side,
    height: side,
  }));
};
