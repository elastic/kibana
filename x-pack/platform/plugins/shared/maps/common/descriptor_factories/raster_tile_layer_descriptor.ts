/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_TYPE } from '../constants';
import type { RasterLayerDescriptor, SourceDescriptor } from '../descriptor_types';

export function createRasterTileLayerDescriptor({
  id,
  sourceDescriptor,
}: {
  id: string;
  sourceDescriptor: SourceDescriptor;
}): RasterLayerDescriptor {
  return {
    id,
    type: LAYER_TYPE.RASTER_TILE,
    sourceDescriptor,
    alpha: 1,
    visible: true,
    minZoom: 0,
    maxZoom: 24,
    includeInFitToBounds: true,
    __dataRequests: [],
  };
}
