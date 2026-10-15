/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { defineMapsPack, mapsPack, type MapsPackOptions } from './src/pack';
export { createMapModel, MAP_PLOT_HEIGHT, MAP_PLOT_WIDTH } from './src/model';
export {
  type MapGeometry,
  type RegionFeatureCollection,
  projectRegions,
  REGION_KEY,
} from './src/geometry';
export { MAP_RAMP_COLORS, rampColor } from './src/ramps';
export { geotileBounds, latToY, lonToX, parseGeotileKey } from './src/projection';
export { mapCanonicalExample, mapExamples } from './src/examples';
export { MAP_SLOT_ATTR } from './src/slot';
export type {
  MapArc,
  MapBasemap,
  MapCell,
  MapMarker,
  MapNode,
  MapRamp,
  MapRegion,
  MapRegionSet,
} from './src/types';
export {
  MAP_MAX_ARCS,
  MAP_MAX_CELLS,
  MAP_MAX_MARKERS,
  MAP_MAX_REGIONS,
  MAP_RAMPS,
  MAP_REGION_SETS,
} from './src/types';
