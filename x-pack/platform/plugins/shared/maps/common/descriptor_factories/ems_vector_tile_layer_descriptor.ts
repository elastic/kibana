/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTOSELECT_EMS_LOCALE, LAYER_TYPE } from '../constants';
import type { EMSVectorTileLayerDescriptor, EMSTMSSourceDescriptor } from '../descriptor_types';
import { createEmsVectorTileStyleDescriptor } from './ems_vector_tile_style_descriptor';

export function createEmsVectorTileLayerDescriptor({
  id,
  sourceDescriptor,
}: {
  id: string;
  sourceDescriptor: EMSTMSSourceDescriptor;
}): EMSVectorTileLayerDescriptor {
  return {
    id,
    type: LAYER_TYPE.EMS_VECTOR_TILE,
    sourceDescriptor,
    alpha: 1,
    visible: true,
    minZoom: 0,
    maxZoom: 24,
    includeInFitToBounds: true,
    locale: AUTOSELECT_EMS_LOCALE,
    style: createEmsVectorTileStyleDescriptor(),
    __dataRequests: [],
  };
}
