/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapturedFeatureState, CapturedImage, CapturedMap } from './capture_js_map';

/**
 * Turns what the MapLibre GL JS map holds (`capture_js_map.ts`) into what MapLibre Native
 * 6.x accepts. Pure, so it is testable without a map: the browser-only parts are removed or
 * made absolute, and everything the JS map built at runtime (images, feature-state) is carried
 * separately to be replayed, since neither is part of a serialized style.
 */
export interface ExportedMap {
  style: Record<string, unknown>;
  images: CapturedImage[];
  featureStates: CapturedFeatureState[];
  view: { center: [number, number]; zoom: number; bearing: number; pitch: number };
  cssWidth: number;
  cssHeight: number;
}

/** Source types MapLibre Native cannot load from a style document. */
const UNSUPPORTED_SOURCE_TYPES = new Set(['canvas', 'video', 'image']);

/**
 * Replaces every `["feature-state", key]` expression with `["get", key]`, in place.
 * Nested anywhere in a layer's paint/layout/filter (`case`, `interpolate`, `match`, ...).
 */
const rewriteFeatureStateExpressions = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    if (value[0] === 'feature-state' && typeof value[1] === 'string') {
      return ['get', value[1]];
    }
    return value.map(rewriteFeatureStateExpressions);
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      (value as Record<string, unknown>)[key] = rewriteFeatureStateExpressions(child);
    }
  }
  return value;
};

/**
 * The Maps client writes its data-driven styling (join values, colour/size ramps, label text)
 * into *feature-state*. MapLibre Native has `setFeatureState`, but state set before the first
 * render was not applied in practice, and for a GeoJSON source the equivalent is simply having
 * those values as feature properties. So for every GeoJSON source whose data is inline: merge
 * each feature's state into its `properties` and make the source's layers read them with
 * `get`. Returns the feature states left over (vector-tile sources, whose features can't be
 * edited) for replay with `setFeatureState`.
 */
const bakeFeatureStateIntoGeoJson = (
  style: {
    sources: Record<string, Record<string, unknown>>;
    layers: Array<Record<string, unknown>>;
  },
  featureStates: CapturedFeatureState[]
): CapturedFeatureState[] => {
  const bakedSources = new Set<string>();
  for (const [sourceId, source] of Object.entries(style.sources)) {
    const data = source.data as { features?: Array<Record<string, unknown>> } | undefined;
    if (source.type !== 'geojson' || !data || !Array.isArray(data.features)) continue;
    const byId = new Map<string, Record<string, unknown>>();
    for (const entry of featureStates) {
      if (entry.source === sourceId) {
        byId.set(String(entry.id), { ...(byId.get(String(entry.id)) ?? {}), ...entry.state });
      }
    }
    for (const feature of data.features) {
      const state = feature.id !== undefined ? byId.get(String(feature.id)) : undefined;
      if (state) {
        feature.properties = { ...((feature.properties as object) ?? {}), ...state };
      }
    }
    bakedSources.add(sourceId);
  }
  for (const layer of style.layers) {
    if (layer.source && bakedSources.has(String(layer.source))) {
      for (const key of ['paint', 'layout', 'filter']) {
        if (layer[key] !== undefined) layer[key] = rewriteFeatureStateExpressions(layer[key]);
      }
    }
  }
  return featureStates.filter((entry) => !bakedSources.has(entry.source));
};

export const exportMapStyleForNative = (
  capture: CapturedMap,
  { resolveUrl }: { resolveUrl: (path: string) => string }
): ExportedMap => {
  const style = JSON.parse(JSON.stringify(capture.style)) as Record<string, unknown> & {
    sources: Record<string, Record<string, unknown>>;
    layers: Array<Record<string, unknown>>;
  };

  // Mercator only: the sample maps use `globeInterpolate`, which Native cannot draw.
  delete style.projection;
  delete style.terrain;
  delete style.sky;
  // Every image is replayed with `addImage` (the Maps client adds EMS sprites one by one
  // rather than through the style's `sprite`), so a `sprite` URL would only double-fetch.
  delete style.sprite;

  const absolute = (value: unknown) =>
    typeof value === 'string' && value.startsWith('/') ? resolveUrl(value) : value;

  if (typeof style.glyphs === 'string') style.glyphs = absolute(style.glyphs);

  for (const [id, source] of Object.entries(style.sources)) {
    if (UNSUPPORTED_SOURCE_TYPES.has(String(source.type))) {
      delete style.sources[id];
      continue;
    }
    if (Array.isArray(source.tiles)) source.tiles = source.tiles.map(absolute);
    if (typeof source.url === 'string') source.url = absolute(source.url);
    if (typeof source.data === 'string') source.data = absolute(source.data);
  }

  style.layers = style.layers.filter(
    (layer) => layer.type === 'background' || (layer.source && style.sources[String(layer.source)])
  );

  const featureStates = bakeFeatureStateIntoGeoJson(style, capture.featureStates);

  return {
    style,
    images: capture.images,
    featureStates,
    view: {
      center: capture.center,
      zoom: capture.zoom,
      bearing: capture.bearing,
      pitch: capture.pitch,
    },
    cssWidth: capture.cssWidth,
    cssHeight: capture.cssHeight,
  };
};
