/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  attributionSchema,
  EMSVectorTileLayerSchema,
  heatmapLayerSchema,
  layerGroupSchema,
  rasterLayerSchema,
  vectorLayerSchema,
} from './layer_schemas';

export type Attribution = TypeOf<typeof attributionSchema>;
export type StoredEMSVectorTileLayer = TypeOf<typeof EMSVectorTileLayerSchema>;
export type StoredHeatmapLayer = TypeOf<typeof heatmapLayerSchema>;
export type StoredLayerGroup = TypeOf<typeof layerGroupSchema>;
export type StoredRasterLayer = TypeOf<typeof rasterLayerSchema>;
export type StoredVectorLayer = TypeOf<typeof vectorLayerSchema>;
