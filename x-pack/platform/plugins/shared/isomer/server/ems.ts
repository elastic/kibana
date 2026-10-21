/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Elastic Maps Service for server drawing, through Kibana's own client (`@elastic/ems-client`, configured as the
// `mapsEms` plugin configures it): boundary files into the maps pack's geometry, and the raster basemap tiles a
// Kibana Maps view shows.

import { EMSClient, type FileLayer, type TMSService } from '@elastic/ems-client';
import type { MapGeometry } from '@kbn/isomer-primitives-maps';

/** Where the EMS file and tile services are, as `mapsEms`'s `EMSSettings` resolves them. */
export interface EmsEndpoints {
  fileApiUrl: string;
  tileApiUrl: string;
  landingPageUrl: string;
}

/** A Kibana Maps view: its center and zoom (MapLibre's, 512-pixel tiles), drawn at this size. */
export interface MapView {
  lat: number;
  lon: number;
  zoom: number;
  width: number;
  height: number;
}

/** The `map` node's `basemap`: raster tiles placed by their tile coordinates. */
export interface MapBasemap {
  zoom: number;
  originX: number;
  originY: number;
  columns: number;
  rows: number;
  tiles: Array<{ col: number; row: number; src: string }>;
  attribution?: string;
}

export interface IsomerEms {
  /** Loads an EMS boundary file into the drawing's geometry. `false` when EMS has no file by that id. */
  loadBoundary(id: string): Promise<boolean>;
  /** The raster tiles of a tile service (by EMS id, as Kibana Maps picks it) covering a view. */
  basemap(serviceId: string, view: MapView): Promise<MapBasemap | undefined>;
}

// The map node draws at most a 4 by 4 grid of tiles, each source at most this many characters.
const MAX_TILE_SPAN = 4;
const MAX_TILE_SRC = 120_000;
const RASTER_TILE_PX = 256;
const MAX_CACHED_TILES = 512;

const lonToX = (lon: number) => (lon + 180) / 360;
const latToY = (lat: number) => {
  const rad = (Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
};

/**
 * The tiles covering a view. A 256-pixel raster tile at zoom z + 1 matches MapLibre's 512-pixel tile at z; a zoom
 * whose tiles wouldn't fit in a 4 by 4 grid steps out until they do.
 */
export const tilesFor = (
  { lat, lon, zoom, width, height }: MapView,
  { minZoom = 0, maxZoom = 10 }: { minZoom?: number; maxZoom?: number } = {}
) => {
  for (let z = Math.min(maxZoom, Math.max(minZoom, Math.round(zoom + 1))); z >= minZoom; z -= 1) {
    const size = RASTER_TILE_PX * 2 ** (zoom + 1 - z);
    const count = 2 ** z;
    const [cx, cy] = [lonToX(lon) * count, latToY(lat) * count];
    const x0 = Math.max(0, Math.floor(cx - width / 2 / size));
    const x1 = Math.min(count - 1, Math.ceil(cx + width / 2 / size) - 1);
    const y0 = Math.max(0, Math.floor(cy - height / 2 / size));
    const y1 = Math.min(count - 1, Math.ceil(cy + height / 2 / size) - 1);
    if (x1 - x0 < MAX_TILE_SPAN && y1 - y0 < MAX_TILE_SPAN) {
      return { zoom: z, x0, y0, columns: x1 - x0 + 1, rows: y1 - y0 + 1 };
    }
  }
  return undefined;
};

/** An EMS client, as `mapsEms`'s `create_ems_client` builds one, with the drawing's geometry to load into. */
export const createIsomerEms = ({
  endpoints,
  kibanaVersion,
  geometry,
}: {
  endpoints: EmsEndpoints;
  kibanaVersion: string;
  geometry: MapGeometry;
}): IsomerEms => {
  const client = new EMSClient({
    language: 'en',
    appName: 'kibana',
    appVersion: kibanaVersion,
    emsVersion: kibanaVersion,
    fileApiUrl: endpoints.fileApiUrl,
    tileApiUrl: endpoints.tileApiUrl,
    landingPageUrl: endpoints.landingPageUrl,
    fetchFunction: (url: RequestInfo) => fetch(url),
    proxyPath: '',
  });
  let fileLayers: Promise<FileLayer[]> | undefined;
  let tmsServices: Promise<TMSService[]> | undefined;
  const tiles = new Map<string, Promise<string | undefined>>();

  const tile = (url: string) => {
    let entry = tiles.get(url);
    if (!entry) {
      if (tiles.size >= MAX_CACHED_TILES) {
        tiles.delete(tiles.keys().next().value!);
      }
      entry = fetch(url)
        .then(async (response) => {
          if (!response.ok) return undefined;
          const type = response.headers.get('content-type') ?? 'image/png';
          const src = `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString(
            'base64'
          )}`;
          return src.length <= MAX_TILE_SRC ? src : undefined;
        })
        .catch(() => undefined);
      tiles.set(url, entry);
    }
    return entry;
  };

  return {
    loadBoundary: async (id) => {
      if (geometry[id]) return true;
      fileLayers ??= client.getFileLayers();
      const layer = (await fileLayers).find((candidate) => candidate.hasId(id));
      const collection = await layer?.getGeoJson();
      if (!collection) return false;
      geometry[id] = collection as MapGeometry[string];
      return true;
    },
    basemap: async (serviceId, view) => {
      tmsServices ??= client.getTMSServices();
      const service = (await tmsServices).find((candidate) => candidate.hasId(serviceId));
      if (!service) return undefined;
      const [template, minZoom, maxZoom] = await Promise.all([
        service.getUrlTemplate(),
        service.getMinZoom('raster'),
        service.getMaxZoom('raster'),
      ]);
      const grid = tilesFor(view, { minZoom: minZoom ?? 0, maxZoom: Math.min(10, maxZoom ?? 10) });
      if (!grid) return undefined;
      const placed = await Promise.all(
        Array.from({ length: grid.columns * grid.rows }, async (_, index) => {
          const [col, row] = [index % grid.columns, Math.floor(index / grid.columns)];
          const src = await tile(
            template
              .replace('{z}', String(grid.zoom))
              .replace('{x}', String(grid.x0 + col))
              .replace('{y}', String(grid.y0 + row))
          );
          return src ? [{ col, row, src }] : [];
        })
      );
      const attribution = service
        .getAttributions()
        .map(({ label }) => label)
        .join(' | ')
        .slice(0, 400);
      return {
        zoom: grid.zoom,
        originX: grid.x0,
        originY: grid.y0,
        columns: grid.columns,
        rows: grid.rows,
        tiles: placed.flat(),
        ...(attribution ? { attribution } : {}),
      };
    },
  };
};
