/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
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

export type CountAggDescriptor = TypeOf<typeof countAggSchema>;
export type FieldedAggDescriptor = TypeOf<typeof fieldedAggSchema>;
export type PercentileAggDescriptor = TypeOf<typeof percentileAggSchema>;
export type AggDescriptor = CountAggDescriptor | FieldedAggDescriptor | PercentileAggDescriptor;

export type AbstractESAggSourceDescriptor = TypeOf<typeof BaseESAggSourceSchema>;
export type AbstractESJoinSourceDescriptor = TypeOf<typeof ESJoinSourceSchema>;
export type AbstractESSourceDescriptor = TypeOf<typeof BaseESSourceSchema>;
export type EMSFileSourceDescriptor = TypeOf<typeof EMSFileSourceSchema>;
export type EMSTMSSourceDescriptor = TypeOf<typeof EMSTMSSourceSchema>;
export type ESGeoGridSourceDescriptor = TypeOf<typeof ESGeoGridSourceSchema>;
export type ESGeoLineSourceDescriptor = TypeOf<typeof ESGeoLineSourceSchema>;
export type ESPewPewSourceDescriptor = TypeOf<typeof ESPewPewSourceSchema>;
export type ESSearchSourceDescriptor = TypeOf<typeof ESSearchSourceSchema>;
export type ESQLSourceDescriptor = TypeOf<typeof ESQLSourceSchema>;
export type ESDistanceSourceDescriptor = TypeOf<typeof ESDistanceSourceSchema>;
export type ESTermSourceDescriptor = TypeOf<typeof ESTermSourceSchema>;
export type KibanaTilemapSourceDescriptor = TypeOf<typeof kibanaTilemapSourceSchema>;
export type WMSSourceDescriptor = TypeOf<typeof WMSSourceSchema>;
export type XYZTMSSourceDescriptor = TypeOf<typeof XYZTMSSourceSchema>;
export type MVTFieldDescriptor = TypeOf<typeof MVTFieldSchema>;
export type TiledSingleLayerVectorSourceDescriptor = TypeOf<
  typeof TiledSingleLayerVectorSourceSchema
>;
export type JoinSourceDescriptor = TypeOf<typeof joinSourceSchema>;
export type SourceDescriptor = TypeOf<typeof sourceSchema>;
