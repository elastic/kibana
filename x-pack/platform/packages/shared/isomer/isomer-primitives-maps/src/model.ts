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
import type { MapArc, MapLayer, MapMarker, MapNode, MapRegion } from './types';

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
  /** The layer's static color, when the arc has no tone. */
  color?: string;
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

/** A data layer as drawn, bottom to top. */
export type MapLayerModel = { opacity: number | undefined } & (
  | { kind: 'regions'; regionSet?: string; regionKey?: string; regions: MapRegionModel[] }
  | { kind: 'markers'; labels: 'beside' | 'inside'; markers: MapMarkerModel[] }
  | { kind: 'cells'; shape: MapNode['cellShape']; cells: MapCellModel[] }
  | { kind: 'arcs'; arcs: MapArcModel[] }
);

/** A data layer before projection: a `layers` entry, or the node's single-layer fields. */
type NodeLayer =
  | (Omit<Extract<MapLayer, { kind: 'regions' }>, 'regionSet'> & { regionSet?: string })
  | Exclude<MapLayer, { kind: 'regions' }>;

/** The node's single-layer fields as layers, in the order they have always drawn, then its `layers`. */
export const layersOf = (node: MapNode): NodeLayer[] => [
  ...(node.regions?.length
    ? [
        {
          kind: 'regions' as const,
          regions: node.regions,
          regionSet: node.regionSet,
          regionKey: node.regionKey,
          regionRamp: node.regionRamp,
        },
      ]
    : []),
  ...(node.cells?.length
    ? [
        {
          kind: 'cells' as const,
          cells: node.cells,
          cellShape: node.cellShape,
          cellRamp: node.cellRamp,
        },
      ]
    : []),
  ...(node.arcs?.length ? [{ kind: 'arcs' as const, arcs: node.arcs }] : []),
  ...(node.markers?.length
    ? [
        {
          kind: 'markers' as const,
          markers: node.markers,
          markerRamp: node.markerRamp,
          markerSize: node.markerSize,
          markerLabels: node.markerLabels,
        },
      ]
    : []),
  ...(node.layers ?? []),
];

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
  /** Every data layer, bottom to top; `markers`, `cells`, `arcs` and `regions` flatten them. */
  layers: MapLayerModel[];
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

const boundsFromFeatures = (layers: readonly NodeLayer[]): GeoBounds => {
  let bounds: GeoBounds | undefined;
  const markers = layers.flatMap((layer) => (layer.kind === 'markers' ? layer.markers : []));
  const arcs = layers.flatMap((layer) => (layer.kind === 'arcs' ? layer.arcs : []));
  const cells = layers.flatMap((layer) => (layer.kind === 'cells' ? layer.cells : []));
  for (const marker of markers) {
    bounds = extendBounds(bounds, {
      west: marker.lon,
      east: marker.lon,
      south: marker.lat,
      north: marker.lat,
    });
  }
  for (const arc of arcs) {
    const [fromLat, fromLon] = arc.from;
    const [toLat, toLon] = arc.to;
    bounds = extendBounds(bounds, {
      west: Math.min(fromLon, toLon),
      east: Math.max(fromLon, toLon),
      south: Math.min(fromLat, toLat),
      north: Math.max(fromLat, toLat),
    });
  }
  for (const cell of cells) {
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

const markerModels = (
  layer: Extract<NodeLayer, { kind: 'markers' }>,
  project: Projector
): MapMarkerModel[] => {
  const markerValues = extent(
    layer.markers.flatMap(({ value }) => (value === undefined ? [] : [value]))
  );
  const sizeOf = (marker: MapMarker) => marker.size ?? marker.value;
  const markerSizes = extent(
    layer.markers.flatMap((marker) => {
      const size = sizeOf(marker);
      return size === undefined ? [] : [size];
    })
  );
  const radius = layer.markerSize ?? (layer.markerRamp ? MARKER_RADIUS : undefined);
  return layer.markers.map((marker: MapMarker) => {
    const point = project(marker.lon, marker.lat);
    const size = sizeOf(marker);
    const scaled =
      radius && size !== undefined && markerSizes.max > markerSizes.min
        ? (size - markerSizes.min) / (markerSizes.max - markerSizes.min)
        : undefined;
    return {
      id: marker.id,
      label: marker.label,
      tone: marker.tone ?? 'neutral',
      value: marker.value,
      radius: radius ? radius.min + (scaled ?? 0) * (radius.max - radius.min) : MARKER_RADIUS.fixed,
      fill:
        layer.markerRamp && marker.value !== undefined
          ? rampColor(layer.markerRamp, marker.value, markerValues.min, markerValues.max)
          : marker.tone
          ? undefined
          : layer.color,
      ...point,
    };
  });
};

export const createMapModel = (node: MapNode): MapModel => {
  const width = node.width ?? MAP_PLOT_WIDTH;
  const height = node.height ?? MAP_PLOT_HEIGHT;
  const fixed = node.view && node.view !== 'fit' ? node.view : undefined;
  const layers = layersOf(node);
  const bounds = fixed ? WORLD : boundsFromFeatures(layers);
  const project = fixed ? viewProjector(fixed, width, height) : fitProjector(bounds, width, height);

  const layerModels: MapLayerModel[] = [];
  let droppedCellCount = 0;
  for (const layer of layers) {
    switch (layer.kind) {
      case 'markers':
        layerModels.push({
          kind: 'markers',
          opacity: layer.opacity,
          labels: layer.markerLabels ?? 'beside',
          markers: markerModels(layer, project),
        });
        break;
      case 'cells': {
        const cellValues = extent(layer.cells.map(({ value }) => value));
        const cells: MapCellModel[] = [];
        for (const cell of layer.cells) {
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
            fill: layer.cellRamp
              ? rampColor(layer.cellRamp, cell.value, cellValues.min, cellValues.max)
              : layer.color,
          });
        }
        layerModels.push({ kind: 'cells', opacity: layer.opacity, shape: layer.cellShape, cells });
        break;
      }
      case 'arcs':
        layerModels.push({
          kind: 'arcs',
          opacity: layer.opacity,
          arcs: layer.arcs.map((arc: MapArc) => ({
            path: arcPath(project(arc.from[1], arc.from[0]), project(arc.to[1], arc.to[0])),
            tone: arc.tone ?? 'neutral',
            weight: arc.weight ?? 1,
            label: arc.label,
            ...(layer.color && !arc.tone ? { color: layer.color } : {}),
          })),
        });
        break;
      case 'regions': {
        const regionValues = extent(layer.regions.map(({ value }) => value));
        layerModels.push({
          kind: 'regions',
          opacity: layer.opacity,
          regionSet: layer.regionSet,
          regionKey: layer.regionKey,
          regions: layer.regions.map((region) => ({
            ...region,
            fill: layer.regionRamp
              ? rampColor(layer.regionRamp, region.value, regionValues.min, regionValues.max)
              : region.tone
              ? undefined
              : layer.color,
          })),
        });
        break;
      }
    }
  }
  const flat = <K extends MapLayerModel['kind']>(kind: K) =>
    layerModels.flatMap((layer) => (layer.kind === kind ? [layer] : [])) as Array<
      Extract<MapLayerModel, { kind: K }>
    >;
  const markers = flat('markers').flatMap((layer) => layer.markers);
  const cells = flat('cells').flatMap((layer) => layer.cells);
  const arcs = flat('arcs').flatMap((layer) => layer.arcs);
  const regions = flat('regions').flatMap((layer) => layer.regions);

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
    layers: layerModels,
    cellShape: node.cellShape ?? flat('cells')[0]?.shape,
    legendUnit: node.legend?.unit,
    basemap: node.basemap,
    bounds,
    droppedCellCount,
  };
};
