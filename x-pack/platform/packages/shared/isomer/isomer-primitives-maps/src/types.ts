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

export const MAP_REGION_SETS = [
  'world_countries',
  'usa_states',
  'france_departments',
  'uk_subdivisions',
] as const;

/** An EMS boundary file; a region's `code` is its ISO 3166-1 alpha-2 code for countries, else its English name. */
export type MapRegionSet = (typeof MAP_REGION_SETS)[number];

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
  /** Colors regions by `value`. Without it a region takes its `tone`. */
  regionRamp?: MapRamp;
  arcs?: MapArc[];
  legend?: { unit?: string };
  basemap?: MapBasemap;
}
