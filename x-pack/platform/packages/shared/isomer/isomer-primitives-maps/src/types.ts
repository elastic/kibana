/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamedColor, PrimitiveNode } from '@elastic/isomer-sdk';

export const MAP_MAX_MARKERS = 150;
export const MAP_MAX_CELLS = 2000;
export const MAP_MAX_REGIONS = 250;
export const MAP_MAX_ARCS = 100;
export const MAP_MAX_BASEMAP_TILES = 16;
export const MAP_MAX_LAYERS = 16;

export const MAP_RAMPS = [
  'blues',
  'greens',
  'greys',
  'reds',
  'yellow_to_red',
  'green_to_red',
  'blue_to_red',
] as const;

/** A sequential color ramp by Kibana Maps' name for it, low to high. */
export type MapRamp = (typeof MAP_RAMPS)[number];

export type MapCellShape = 'grid' | 'hex' | 'heatmap';

/** The EMS boundary files whose match field the pack knows without a `regionKey`. */
export const MAP_REGION_SETS = [
  'world_countries',
  'usa_states',
  'france_departments',
  'uk_subdivisions',
] as const;

/**
 * An EMS boundary file by its id, such as `world_countries` or `usa_states`: any file in the EMS catalog, as a
 * Kibana Maps layer can name. Its geometry comes from the host.
 */
export type MapRegionSet = string;

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  label?: string;
  tone?: NamedColor;
  value?: number;
  /** What the marker's size encodes, when it is not \`value\`. */
  size?: number;
  group?: string;
}

export interface MapCell {
  key: string;
  value: number;
}

export interface MapRegion {
  code: string;
  label?: string;
  value: number;
  tone?: NamedColor;
}

export interface MapArc {
  from: [number, number];
  to: [number, number];
  label?: string;
  weight?: number;
  tone?: NamedColor;
}

export interface MapFixedView {
  lat: number;
  lon: number;
  zoom: number;
}

/** Host-stamped EMS raster grid. Models must not set this. */
export interface MapBasemap {
  tiles?: Array<{ col: number; row: number; src: string }>;
  columns?: number;
  rows?: number;
  zoom?: number;
  originX?: number;
  originY?: number;
  attribution?: string;
  unavailable?: boolean;
}

export interface MapNode extends PrimitiveNode {
  type: 'map';
  label?: string;
  /** Drawn size in CSS pixels. Defaults to 700 by 360. */
  width?: number;
  height?: number;
  /** `fit` frames the data; a fixed view is a Web Mercator center and zoom, as Kibana Maps saves one. */
  view?: 'fit' | MapFixedView;
  markers?: MapMarker[];
  /** Colors markers by `value` and sizes them by it, as Kibana draws geo-grid clusters. */
  markerRamp?: MapRamp;
  /** Radius range in pixels for markers sized by \`size\`, or by \`value\` without one. */
  markerSize?: { min: number; max: number };
  /** \`inside\` centers a marker's label on it, as Kibana prints a cluster's count. Defaults to \`beside\`. */
  markerLabels?: 'beside' | 'inside';
  cells?: MapCell[];
  cellShape?: MapCellShape;
  cellRamp?: MapRamp;
  regions?: MapRegion[];
  regionSet?: MapRegionSet;
  /** The boundary property a region's `code` matches, as a Maps join's left field; defaults by `regionSet`. */
  regionKey?: string;
  /** Colors regions by `value`. Without it a region takes its `tone`. */
  regionRamp?: MapRamp;
  arcs?: MapArc[];
  /** Data layers bottom to top, as Kibana stacks a map's layers; drawn above the single-layer fields. */
  layers?: MapLayer[];
  legend?: { unit?: string };
  basemap?: MapBasemap;
}

interface MapLayerBase {
  /** A static `#rrggbb` fill, as a Maps layer's static color; a ramp's colors win where the layer has one. */
  color?: string;
  /** The layer's opacity, 0 to 1, as a Maps layer's `alpha`; defaults to each kind's own. */
  opacity?: number;
}

export interface MapRegionsLayer extends MapLayerBase {
  kind: 'regions';
  regions: MapRegion[];
  regionSet: MapRegionSet;
  regionKey?: string;
  regionRamp?: MapRamp;
}

export interface MapMarkersLayer extends MapLayerBase {
  kind: 'markers';
  markers: MapMarker[];
  markerRamp?: MapRamp;
  markerSize?: { min: number; max: number };
  markerLabels?: 'beside' | 'inside';
}

export interface MapCellsLayer extends MapLayerBase {
  kind: 'cells';
  cells: MapCell[];
  cellShape?: MapCellShape;
  cellRamp?: MapRamp;
}

export interface MapArcsLayer extends MapLayerBase {
  kind: 'arcs';
  arcs: MapArc[];
}

export type MapLayer = MapRegionsLayer | MapMarkersLayer | MapCellsLayer | MapArcsLayer;
