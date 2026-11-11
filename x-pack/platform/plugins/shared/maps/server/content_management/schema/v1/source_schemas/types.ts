/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  countAggSchema,
  fieldedAggSchema,
  percentileAggSchema,
  BaseESAggSourceSchema,
  ESGeoGridSourceSchema,
  ESGeoLineSourceSchema,
  ESPewPewSourceSchema,
} from './es_agg_source_schemas';
import type {
  ESDistanceSourceSchema,
  ESJoinSourceSchema,
  ESTermSourceSchema,
  joinSourceSchema,
} from './es_join_source_schemas';
import type {
  BaseESSourceSchema,
  ESQLSourceSchema,
  ESSearchSourceSchema,
} from './es_source_schemas';
import type {
  EMSFileSourceSchema,
  EMSTMSSourceSchema,
  kibanaTilemapSourceSchema,
  MVTFieldSchema,
  sourceSchema,
  TiledSingleLayerVectorSourceSchema,
  WMSSourceSchema,
  XYZTMSSourceSchema,
} from './source_schemas';

export type CountAggDescriptor = z.output<typeof countAggSchema>;
export type FieldedAggDescriptor = z.output<typeof fieldedAggSchema>;
export type PercentileAggDescriptor = z.output<typeof percentileAggSchema>;
export type AggDescriptor = CountAggDescriptor | FieldedAggDescriptor | PercentileAggDescriptor;

export type AbstractESAggSourceDescriptor = z.output<typeof BaseESAggSourceSchema>;
export type AbstractESJoinSourceDescriptor = z.output<typeof ESJoinSourceSchema>;
export type AbstractESSourceDescriptor = z.output<typeof BaseESSourceSchema>;
export type EMSFileSourceDescriptor = z.output<typeof EMSFileSourceSchema>;
export type EMSTMSSourceDescriptor = z.output<typeof EMSTMSSourceSchema>;
export type ESGeoGridSourceDescriptor = z.output<typeof ESGeoGridSourceSchema>;
export type ESGeoLineSourceDescriptor = z.output<typeof ESGeoLineSourceSchema>;
export type ESPewPewSourceDescriptor = z.output<typeof ESPewPewSourceSchema>;
export type ESSearchSourceDescriptor = z.output<typeof ESSearchSourceSchema>;
export type ESQLSourceDescriptor = z.output<typeof ESQLSourceSchema>;
export type ESDistanceSourceDescriptor = z.output<typeof ESDistanceSourceSchema>;
export type ESTermSourceDescriptor = z.output<typeof ESTermSourceSchema>;
export type KibanaTilemapSourceDescriptor = z.output<typeof kibanaTilemapSourceSchema>;
export type WMSSourceDescriptor = z.output<typeof WMSSourceSchema>;
export type XYZTMSSourceDescriptor = z.output<typeof XYZTMSSourceSchema>;
export type MVTFieldDescriptor = z.output<typeof MVTFieldSchema>;
export type TiledSingleLayerVectorSourceDescriptor = z.output<
  typeof TiledSingleLayerVectorSourceSchema
>;
export type JoinSourceDescriptor = z.output<typeof joinSourceSchema>;
export type SourceDescriptor = z.output<typeof sourceSchema>;
