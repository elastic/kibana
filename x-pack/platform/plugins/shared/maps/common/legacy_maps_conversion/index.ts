/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createEmsVectorTileBasemapLayerDescriptor,
  createLegacyCompatibleBasemapLayersFromLegacyParams,
  createWmsOverlayLayerDescriptor,
  getLegacyEmsLightModeDefault,
  normalizeLegacyEmsBasemapId,
} from './basemap_layers';
export type { LegacyBasemapLayersOptions } from './basemap_layers';
export { getEmsLayerIdFromSelectedLayer } from './ems_layer_id';
export {
  createLegacyRegionMapAggDescriptor,
  createLegacyTileMapAggDescriptor,
} from './agg_descriptors';
export { getLegacyGeoGridRequestType } from './geo_grid_request_type';
