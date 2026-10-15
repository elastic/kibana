/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamedColor } from '@elastic/isomer-sdk';
import {
  extendBounds,
  geotileBounds,
  latToY,
  lonToX,
  padBounds,
  parseGeotileKey,
  type GeoBounds,
} from './projection';
import { rampColor } from './ramps';
import type { MapArc, MapMarker, MapNode, MapRegion } from './types';

export const MAP_PLOT_WIDTH = 700;
export const MAP_PLOT_HEIGHT = 360;

/** MapLibre's tile size: at zoom z the world is 512 * 2^z pixels wide. */
const WORLD_TILE_PX = 512;

/** Kibana's coarse geo-grid clusters: 16 to 48 pixels across. */
const MARKER_RADIUS = { min: 8, max: 24, fixed: 5 };

export interface ProjectedPoint {
  x: number;
  y: number;
}

export type Projector = (lon: number, lat: number) => ProjectedPoint;

export interface MapMarkerModel extends ProjectedPoint {
  id: string;
  label: string | undefined;
  tone: NamedColor;
  value: number | undefined;
  radius: number;
  /** A ramp color; without one the marker takes its tone. */
  fill: string | undefined;
}

export interface MapCellModel {
  key: string;
  value: number;
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string | undefined;
}

export interface MapArcModel {
  path: string;
  tone: NamedColor;
  weight: number;
  label: string | undefined;
}

export interface MapTileModel {
  src: string;
  col: number;
  row: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MapRegionModel extends MapRegion {
  fill: string | undefined;
}

export interface MapModel {
  label: string | undefined;
  ariaLabel: string;
  width: number;
  height: number;
  project: Projector;
  markers: MapMarkerModel[];
  cells: MapCellModel[];
  arcs: MapArcModel[];
  tiles: MapTileModel[];
  regions: MapRegionModel[];
  cellShape: MapNode['cellShape'];
  legendUnit: string | undefined;
  basemap: MapNode['basemap'];
  bounds: GeoBounds;
  droppedCellCount: number;
}

const WORLD: GeoBounds = { west: -180, south: -60, east: 180, north: 75 };

/** Fits `bounds` to the plot, as `view: 'fit'` does. */
const fitProjector = (bounds: GeoBounds, width: number, height: number): Projector => {
  const minX = lonToX(bounds.west);
  const maxX = lonToX(bounds.east);
  const minY = latToY(bounds.north);
  const maxY = latToY(bounds.south);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  return (lon, lat) => ({
    x: ((lonToX(lon) - minX) / spanX) * width,
    y: ((latToY(lat) - minY) / spanY) * height,
  });
};

/** Web Mercator at a center and zoom, as MapLibre draws a Kibana map in a panel of this size. */
const viewProjector = (
  { lat, lon, zoom }: { lat: number; lon: number; zoom: number },
  width: number,
  height: number
): Projector => {
  const world = WORLD_TILE_PX * 2 ** zoom;
  const centerX = lonToX(lon) * world;
  const centerY = latToY(lat) * world;
  return (pointLon, pointLat) => ({
    x: lonToX(pointLon) * world - centerX + width / 2,
    y: latToY(pointLat) * world - centerY + height / 2,
  });
};

const boundsFromFeatures = (node: MapNode): GeoBounds => {
  let bounds: GeoBounds | undefined;
  for (const marker of node.markers ?? []) {
    bounds = extendBounds(bounds, {
      west: marker.lon,
      east: marker.lon,
      south: marker.lat,
      north: marker.lat,
    });
  }
  for (const arc of node.arcs ?? []) {
    const [fromLat, fromLon] = arc.from;
    const [toLat, toLon] = arc.to;
    bounds = extendBounds(bounds, {
      west: Math.min(fromLon, toLon),
      east: Math.max(fromLon, toLon),
      south: Math.min(fromLat, toLat),
      north: Math.max(fromLat, toLat),
    });
  }
  for (const cell of node.cells ?? []) {
    const tile = parseGeotileKey(cell.key);
    if (tile) {
      bounds = extendBounds(bounds, geotileBounds(tile));
    }
  }
  return bounds ? padBounds(bounds) : WORLD;
};

const arcPath = (from: ProjectedPoint, to: ProjectedPoint): string => {
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - Math.max(Math.abs(to.x - from.x) * 0.2, 16);
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(
    1
  )} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
};

const extent = (values: readonly number[]) =>
  values.length === 0 ? { min: 0, max: 0 } : { min: Math.min(...values), max: Math.max(...values) };

export const createMapModel = (node: MapNode): MapModel => {
  const width = node.width ?? MAP_PLOT_WIDTH;
  const height = node.height ?? MAP_PLOT_HEIGHT;
  const fixed = node.view && node.view !== 'fit' ? node.view : undefined;
  const bounds = fixed ? WORLD : boundsFromFeatures(node);
  const project = fixed ? viewProjector(fixed, width, height) : fitProjector(bounds, width, height);

  const markerValues = extent(
    (node.markers ?? []).flatMap(({ value }) => (value === undefined ? [] : [value]))
  );
  const markers: MapMarkerModel[] = (node.markers ?? []).map((marker: MapMarker) => {
    const point = project(marker.lon, marker.lat);
    const scaled =
      node.markerRamp && marker.value !== undefined && markerValues.max > markerValues.min
        ? (marker.value - markerValues.min) / (markerValues.max - markerValues.min)
        : undefined;
    return {
      id: marker.id,
      label: marker.label,
      tone: marker.tone ?? 'neutral',
      value: marker.value,
      radius: node.markerRamp
        ? MARKER_RADIUS.min + (scaled ?? 0) * (MARKER_RADIUS.max - MARKER_RADIUS.min)
        : MARKER_RADIUS.fixed,
      fill:
        node.markerRamp && marker.value !== undefined
          ? rampColor(node.markerRamp, marker.value, markerValues.min, markerValues.max)
          : undefined,
      ...point,
    };
  });

  const cellValues = extent((node.cells ?? []).map(({ value }) => value));
  let droppedCellCount = 0;
  const cells: MapCellModel[] = [];
  for (const cell of node.cells ?? []) {
    const tile = parseGeotileKey(cell.key);
    if (!tile) {
      droppedCellCount += 1;
      continue;
    }
    const tileBounds = geotileBounds(tile);
    const topLeft = project(tileBounds.west, tileBounds.north);
    const bottomRight = project(tileBounds.east, tileBounds.south);
    cells.push({
      key: cell.key,
      value: cell.value,
      left: topLeft.x,
      top: topLeft.y,
      width: Math.max(bottomRight.x - topLeft.x, 1),
      height: Math.max(bottomRight.y - topLeft.y, 1),
      fill: node.cellRamp
        ? rampColor(node.cellRamp, cell.value, cellValues.min, cellValues.max)
        : undefined,
    });
  }

  const arcs: MapArcModel[] = (node.arcs ?? []).map((arc: MapArc) => ({
    path: arcPath(project(arc.from[1], arc.from[0]), project(arc.to[1], arc.to[0])),
    tone: arc.tone ?? 'neutral',
    weight: arc.weight ?? 1,
    label: arc.label,
  }));

  const regionValues = extent((node.regions ?? []).map(({ value }) => value));
  const regions: MapRegionModel[] = (node.regions ?? []).map((region) => ({
    ...region,
    fill: node.regionRamp
      ? rampColor(node.regionRamp, region.value, regionValues.min, regionValues.max)
      : undefined,
  }));

  const tiles: MapTileModel[] = [];
  const { basemap } = node;
  if (
    basemap?.tiles &&
    basemap.zoom !== undefined &&
    basemap.originX !== undefined &&
    basemap.originY !== undefined
  ) {
    for (const tile of basemap.tiles) {
      const tileBounds = geotileBounds({
        z: basemap.zoom,
        x: basemap.originX + tile.col,
        y: basemap.originY + tile.row,
      });
      const topLeft = project(tileBounds.west, tileBounds.north);
      const bottomRight = project(tileBounds.east, tileBounds.south);
      tiles.push({
        src: tile.src,
        col: tile.col,
        row: tile.row,
        left: topLeft.x,
        top: topLeft.y,
        width: Math.max(bottomRight.x - topLeft.x, 1),
        height: Math.max(bottomRight.y - topLeft.y, 1),
      });
    }
  }

  return {
    label: node.label,
    ariaLabel: node.label ?? 'Map',
    width,
    height,
    project,
    markers,
    cells,
    arcs,
    tiles,
    regions,
    cellShape: node.cellShape,
    legendUnit: node.legend?.unit,
    basemap: node.basemap,
    bounds,
    droppedCellCount,
  };
};
