/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRegionMapLayerDescriptorParams } from '../../classes/layers/create_region_map_layer_descriptor';

export const REGION_MAP_RENDER = 'region_map_vis';
export const REGION_MAP_VIS_TYPE = 'region_map';

export interface RegionMapVisParams {
  colorSchema: string;
  mapZoom: number;
  mapCenter: [number, number];
  selectedLayer: {
    isEMS: boolean;
    id: string | number;
    layerId: string;
  };
  selectedJoinField: {
    name: string;
  };
}

export interface RegionMapVisConfig extends RegionMapVisParams {
  layerDescriptorParams: CreateRegionMapLayerDescriptorParams;
}
