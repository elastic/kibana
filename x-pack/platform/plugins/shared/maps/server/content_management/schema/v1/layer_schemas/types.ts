/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  attributionSchema,
  EMSVectorTileLayerSchema,
  heatmapLayerSchema,
  layerGroupSchema,
  rasterLayerSchema,
  vectorLayerSchema,
} from './layer_schemas';

export type Attribution = z.output<typeof attributionSchema>;
export type StoredEMSVectorTileLayer = z.output<typeof EMSVectorTileLayerSchema>;
export type StoredHeatmapLayer = z.output<typeof heatmapLayerSchema>;
export type StoredLayerGroup = z.output<typeof layerGroupSchema>;
export type StoredRasterLayer = z.output<typeof rasterLayerSchema>;
export type StoredVectorLayer = z.output<typeof vectorLayerSchema>;
