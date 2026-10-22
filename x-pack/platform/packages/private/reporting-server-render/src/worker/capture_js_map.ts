/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ShimUsageLog } from './shim_usage_log';

/**
 * Reads a finished map out of the real MapLibre GL JS `Map` the Maps embeddable drives
 * inside the booted page. The client does all the hard work -- EMS style sync, GeoJSON data
 * from `data.search`, joins and colour/size ramps written as feature-state, icon sprites --
 * and the JS map holds the result; only drawing it needs a GPU, which is why the pixels come
 * from MapLibre Native (`render_map_panel.ts`) fed by this capture.
 */

/** The slice of MapLibre GL JS's `Map` this reads (its public API plus the style's image manager and per-source feature state). */
export interface JsMapLike {
  loaded: () => boolean;
  getStyle: () => { sources: Record<string, unknown>; layers: unknown[] } & Record<string, unknown>;
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  getBearing: () => number;
  getPitch: () => number;
  getCanvas: () => { style: { width: string; height: string } };
  style?: {
    imageManager?: {
      images: Record<
        string,
        {
          data: { width: number; height: number; data: Uint8Array | Uint8ClampedArray };
          pixelRatio: number;
          sdf: boolean;
        }
      >;
    };
    sourceCaches?: Record<
      string,
      {
        _state?: {
          state?: Record<string, Record<string, Record<string, unknown>>>;
          stateChanges?: Record<string, Record<string, Record<string, unknown>>>;
        };
      }
    >;
  };
}

export interface CapturedImage {
  id: string;
  width: number;
  height: number;
  pixelRatio: number;
  sdf: boolean;
  data: Buffer;
}

export interface CapturedFeatureState {
  source: string;
  /** Absent for GeoJSON sources, whose single internal layer name is an implementation detail. */
  sourceLayer?: string;
  id: string | number;
  state: Record<string, unknown>;
}

export interface CapturedMap {
  style: ReturnType<JsMapLike['getStyle']>;
  images: CapturedImage[];
  featureStates: CapturedFeatureState[];
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  /** The map canvas's CSS size: what the native render is sized to. */
  cssWidth: number;
  cssHeight: number;
}

/** MapLibre GL JS names the single layer inside a GeoJSON source's tiles this. */
const GEOJSON_TILE_LAYER = '_geojsonTileLayer';

/**
 * Finds the `MbMap` component's `_mbMap` for a panel by walking the React fiber from the map
 * container, so the Maps plugin needs no hook. `getElementsByClassName`, not a selector.
 */
export const findMapInstance = (panel: Element): JsMapLike | undefined => {
  const container = panel.getElementsByClassName('maplibregl-map')[0];
  if (!container) return undefined;
  // The Maps embeddable's container is React-managed; a Vega map view's is plain DOM inside a
  // React-managed wrapper, so start from the nearest ancestor that has a fiber.
  let anchor: Element | null = container;
  let key: string | undefined;
  while (anchor && !(key = Object.keys(anchor).find((k) => k.startsWith('__reactFiber$')))) {
    anchor = anchor.parentElement;
  }
  let fiber = anchor && key ? (anchor as unknown as Record<string, unknown>)[key] : undefined;
  while (fiber) {
    const node = fiber as {
      stateNode?: { _mbMap?: JsMapLike };
      memoizedState?: unknown;
      return?: unknown;
    };
    // Maps embeddable: a class component holding `_mbMap`.
    if (node.stateNode && node.stateNode._mbMap) return node.stateNode._mbMap;
    // Vega map view: `VegaVisualization` lives in a `useRef` of the renderer's function
    // component, and its map view keeps the map as `mapBoxInstance`.
    let hook = node.memoizedState as { memoizedState?: unknown; next?: unknown } | null | undefined;
    for (let guard = 0; hook && typeof hook === 'object' && guard < 50; guard++) {
      const value = hook.memoizedState as
        | { current?: { vegaView?: { mapBoxInstance?: JsMapLike } } }
        | undefined;
      const vegaMap =
        value && typeof value === 'object' ? value.current?.vegaView?.mapBoxInstance : undefined;
      if (vegaMap) return vegaMap;
      hook = hook.next as typeof hook;
    }
    fiber = node.return;
  }
  return undefined;
};

const parseId = (id: string): string | number => (/^\d+$/.test(id) ? Number(id) : id);

const collectFeatureStates = (map: JsMapLike): CapturedFeatureState[] => {
  const out: CapturedFeatureState[] = [];
  const sourceCaches = map.style?.sourceCaches ?? {};
  for (const [source, cache] of Object.entries(sourceCaches)) {
    const merged = new Map<string, Record<string, unknown>>();
    for (const bucket of [cache._state?.state, cache._state?.stateChanges]) {
      for (const [sourceLayer, byId] of Object.entries(bucket ?? {})) {
        for (const [id, state] of Object.entries(byId)) {
          const key = `${sourceLayer}\u0000${id}`;
          merged.set(key, { ...(merged.get(key) ?? {}), ...state });
        }
      }
    }
    for (const [key, state] of merged) {
      const [sourceLayer, id] = key.split('\u0000');
      out.push({
        source,
        ...(sourceLayer && sourceLayer !== GEOJSON_TILE_LAYER ? { sourceLayer } : {}),
        id: parseId(id),
        state,
      });
    }
  }
  return out;
};

export const captureMap = (map: JsMapLike): CapturedMap => {
  const style = map.getStyle();
  const images = Object.entries(map.style?.imageManager?.images ?? {}).map(([id, image]) => ({
    id,
    width: image.data.width,
    height: image.data.height,
    pixelRatio: image.pixelRatio || 1,
    sdf: Boolean(image.sdf),
    data: Buffer.from(
      image.data.data.buffer,
      image.data.data.byteOffset,
      image.data.data.byteLength
    ),
  }));
  const canvasStyle = map.getCanvas().style;
  const center = map.getCenter();
  return {
    style,
    images,
    featureStates: collectFeatureStates(map),
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    cssWidth: parseFloat(canvasStyle.width) || 0,
    cssHeight: parseFloat(canvasStyle.height) || 0,
  };
};

/** Changes whenever anything the capture would contain changes. */
export const mapFingerprint = (map: JsMapLike): string => {
  const style = map.getStyle();
  const center = map.getCenter();
  return [
    JSON.stringify(style).length,
    Object.keys(map.style?.imageManager?.images ?? {}).length,
    collectFeatureStates(map).length,
    center.lng,
    center.lat,
    map.getZoom(),
  ].join('|');
};

export interface MapSettleResult {
  map?: JsMapLike;
  /** Why the wait ended early or without a map, for the usage log / warning. */
  note?: string;
}

/**
 * Waits for each map panel's JS map to exist and stop changing. `data-render-complete` can't
 * be used: a tiled layer (including the EMS basemap) reports loading until worker-parsed tiles
 * arrive, and the worker is a no-op here, so a map panel never completes on its own. The
 * fingerprint going quiet for `quietMs` is the signal instead. `flushAnimationFrames` each
 * poll: MapLibre's style load and repaint ride `requestAnimationFrame`. Never throws; a
 * timeout returns what the map holds.
 */
export const waitForMapPanelsSettled = async (
  env: {
    document: Document;
    flushAnimationFrames: (times?: number) => void;
    usageLog: ShimUsageLog;
  },
  panelIds: string[],
  {
    quietMs = 1000,
    timeoutMs = 15_000,
    pollIntervalMs = 100,
    mountGraceMs = 2000,
  }: { quietMs?: number; timeoutMs?: number; pollIntervalMs?: number; mountGraceMs?: number } = {}
): Promise<Map<string, MapSettleResult>> => {
  const results = new Map<string, MapSettleResult>();
  const state = new Map<string, { fingerprint: string; since: number }>();
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  const pending = new Set(panelIds);

  while (pending.size > 0) {
    env.flushAnimationFrames();
    const now = Date.now();
    for (const id of Array.from(pending)) {
      const panel = env.document.getElementById(`panel-${id}`);
      const map = panel ? findMapInstance(panel) : undefined;
      if (map) {
        const fingerprint = mapFingerprint(map);
        const known = state.get(id);
        if (!known || known.fingerprint !== fingerprint) {
          state.set(id, { fingerprint, since: now });
        } else if (now - known.since >= quietMs) {
          results.set(id, { map });
          pending.delete(id);
        }
      } else if (
        now - startedAt >= mountGraceMs &&
        !panel?.getElementsByClassName('maplibregl-map')[0]
      ) {
        // The embeddable never mounted a map container (it failed, or isn't a map after
        // all): nothing to wait for.
        results.set(id, { note: 'no map was created' });
        env.usageLog.record('mapSettle.noMap', id);
        pending.delete(id);
      }
    }
    if (now > deadline) {
      for (const id of pending) {
        const panel = env.document.getElementById(`panel-${id}`);
        const map = panel ? findMapInstance(panel) : undefined;
        results.set(id, {
          map,
          note: map ? 'timed out waiting for the map to settle' : 'no map was created',
        });
        env.usageLog.record('mapSettle.timeout', `${id}: ${map ? 'unsettled' : 'no map'}`);
      }
      break;
    }
    if (pending.size > 0) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return results;
};
