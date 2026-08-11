/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createEmsVectorTileBasemapLayerDescriptor,
  createLegacyCompatibleBasemapLayersFromLegacyParams,
} from './basemap_layers';
export { getEmsLayerIdFromSelectedLayer } from './ems_layer_id';
export { createRegionMapAggDescriptor, createTileMapAggDescriptor } from './agg_descriptors';
export { getGeoGridRequestType } from './geo_grid_request_type';
export {
  createRegionMapLayerDescriptor,
  createTileMapLayerDescriptor,
} from './legacy_map_layer_descriptors';
export type {
  CreateRegionMapLayerDescriptorParams,
  CreateTileMapLayerDescriptorParams,
} from './legacy_map_layer_descriptors';
export {
  extractRegionMapLayerDescriptorParams,
  extractTileMapLayerDescriptorParams,
} from './extract_layer_descriptor_params';
export type {
  ExtractedRegionMapLayerDescriptorParams,
  ExtractedTileMapLayerDescriptorParams,
} from './extract_layer_descriptor_params';
