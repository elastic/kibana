/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LayerDescriptor } from '../../../common/descriptor_types';
import { createRegionMapLayerDescriptor } from '../../classes/layers/create_region_map_layer_descriptor';
import type { MapsAppRegionMapLocatorParams, MapsAppRegionMapLocatorDependencies } from './types';

export async function getLocation(
  params: MapsAppRegionMapLocatorParams,
  deps: MapsAppRegionMapLocatorDependencies
) {
  const {
    label,
    emsLayerId,
    leftFieldName,
    termsFieldName,
    termsSize,
    colorSchema,
    indexPatternId,
    metricAgg,
    metricFieldName,
    filters,
    query,
    timeRange,
    hash = true,
  } = params;
  const initialLayers = [] as unknown as LayerDescriptor[] & SerializableRecord;
  const regionMapLayerDescriptor = createRegionMapLayerDescriptor({
    label,
    emsLayerId,
    leftFieldName,
    termsFieldName,
    termsSize,
    colorSchema,
    indexPatternId,
    metricAgg,
    metricFieldName,
  });
  if (regionMapLayerDescriptor) {
    initialLayers.push(regionMapLayerDescriptor);
  }

  return await deps.locator.getLocation({
    initialLayers,
    filters,
    query,
    timeRange,
    hash,
  });
}
