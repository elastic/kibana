/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Map as MbglMap } from '@maplibre/maplibre-gl-native';
import type { LoopbackHttpClient } from '../services/loopback_http_client';
import { nodeHttpFetch } from '../services/node_http_fetch';
import type { ExportedMap } from './export_map_style';
import { DEFAULT_ALLOWED_EXTERNAL_ORIGINS } from './loopback_resource_loader';

/**
 * Draws a map panel's pixels with MapLibre Native: the one part of a map that needs a GPU.
 * The *content* -- EMS basemap, GeoJSON layers, joins, colour/size ramps, icons -- is what the
 * real maps client built in the booted page's MapLibre GL JS map, exported by
 * `capture_js_map.ts`/`export_map_style.ts` and replayed here: the style, every image added at
 * runtime (`addImage`), and every feature-state entry (`setFeatureState`, where the client
 * writes its data-driven styling).
 *
 * `maplibre-gl` in the page cannot draw itself: `getContext('webgl')` is a stub
 * (`webgl_stub.ts`), and `headless-gl` cannot be built on any current platform. Fidelity gaps
 * to expect against the browser: mercator only (the sample maps ask for a globe at low zoom),
 * different label placement, and vector-tile layers only when the loopback tile route works.
 */
export interface RenderNativeMapOptions {
  exported: ExportedMap;
  client: LoopbackHttpClient;
  /** CSS size to render; defaults to the captured map canvas's. */
  widthPx?: number;
  heightPx?: number;
  /** Raster pixels per CSS pixel; the result is `width * ratio` by `height * ratio`. */
  ratio?: number;
  allowedExternalOrigins?: readonly string[];
}

export interface NativeMapImage {
  /** Straight RGBA, `width * height * 4` bytes. */
  rgba: Uint8Array;
  width: number;
  height: number;
}

interface ResourceResponse {
  data: Uint8Array;
}

/**
 * MapLibre Native's resource callback: every style/source/tile/glyph/sprite the style asks
 * for. Kibana's own origin goes through the loopback client (the report's forwarded headers,
 * plus the version header Kibana's internal maps routes require; its fetch also gunzips, which
 * Native requires of what it is handed); Elastic Maps Service origins are fetched directly;
 * anything else is refused.
 */
export const createNativeRequestHandler = (
  client: LoopbackHttpClient,
  allowedExternalOrigins: readonly string[]
) => {
  const kibanaOrigin = new URL(client.resolveUrl('/')).origin;
  return (
    req: { url: string; kind: number },
    callback: (error?: Error, response?: ResourceResponse) => void
  ) => {
    const run = async () => {
      let origin: string;
      try {
        origin = new URL(req.url).origin;
      } catch {
        throw new Error(`Unparseable map resource URL "${req.url}"`);
      }
      let response: Response;
      if (origin === kibanaOrigin) {
        response = await client.fetch(req.url.slice(origin.length), {
          headers: { 'elastic-api-version': '1' },
        });
      } else if (allowedExternalOrigins.includes(origin)) {
        response = await nodeHttpFetch(req.url);
      } else {
        throw new Error(`Refusing map resource from non-allow-listed origin "${origin}"`);
      }
      // ResourceKind.Tile: a missing tile is empty, not an error.
      if (response.status === 204 || (response.status === 404 && req.kind === 3)) return undefined;
      if (!response.ok) throw new Error(`Request to ${req.url} failed with ${response.status}`);
      return { data: new Uint8Array(await response.arrayBuffer()) };
    };
    run().then(
      (response) => (response ? callback(undefined, response) : callback()),
      (error) => callback(error instanceof Error ? error : new Error(String(error)))
    );
  };
};

export const renderNativeMap = async ({
  exported,
  client,
  widthPx = exported.cssWidth,
  heightPx = exported.cssHeight,
  ratio = 2,
  allowedExternalOrigins = DEFAULT_ALLOWED_EXTERNAL_ORIGINS,
}: RenderNativeMapOptions): Promise<NativeMapImage> => {
  const width = Math.max(1, Math.round(widthPx));
  const height = Math.max(1, Math.round(heightPx));
  const map = new MbglMap({
    request: createNativeRequestHandler(client, allowedExternalOrigins),
    ratio,
  });
  try {
    map.load(exported.style);
    for (const image of exported.images) {
      map.addImage(image.id, image.data, {
        width: image.width,
        height: image.height,
        pixelRatio: image.pixelRatio,
        sdf: image.sdf,
      });
    }
    const nativeMap = map as unknown as {
      setFeatureState: (
        feature: { source: string; sourceLayer?: string; id: string | number },
        state: Record<string, unknown>
      ) => void;
    };
    for (const { source, sourceLayer, id, state } of exported.featureStates) {
      nativeMap.setFeatureState({ source, ...(sourceLayer ? { sourceLayer } : {}), id }, state);
    }
    const rgba = await new Promise<Uint8Array>((resolve, reject) => {
      map.render(
        {
          zoom: exported.view.zoom,
          center: exported.view.center,
          bearing: exported.view.bearing,
          pitch: exported.view.pitch,
          width,
          height,
        },
        (error, result) => (error ? reject(error) : resolve(result as Uint8Array))
      );
    });
    return { rgba, width: width * ratio, height: height * ratio };
  } finally {
    map.release();
  }
};
