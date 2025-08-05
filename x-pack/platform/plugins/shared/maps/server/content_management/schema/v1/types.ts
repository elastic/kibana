/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  mapAttributesSchema,
  mapsGetResultSchema,
  mapsCreateOptionsSchema,
  mapsCreateResultSchema,
  mapsSearchOptionsSchema,
  mapsUpdateOptionsSchema,
} from './cm_services';
import {
  EMSFileSourceSchema,
  EMSTMSSourceSchema,
  ESAggSourceSchema,
  ESDistanceSourceSchema,
  ESGeoGridSourceSchema,
  ESGeoLineSourceSchema,
  ESJoinSourceSchema,
  ESPewPewSourceSchema,
  ESSearchSourceSchema,
  ESSourceSchema,
  ESTermSourceSchema,
  KibanaTilemapSourceSchema,
} from './source_schemas';

export type MapsSavedObjectAttributes = TypeOf<typeof mapAttributesSchema>;

export type MapsCreateOptions = TypeOf<typeof mapsCreateOptionsSchema>;
export type MapsUpdateOptions = TypeOf<typeof mapsUpdateOptionsSchema>;
export type MapsSearchOptions = TypeOf<typeof mapsSearchOptionsSchema>;

export type MapsGetOut = TypeOf<typeof mapsGetResultSchema>;
export type MapsCreateOut = TypeOf<typeof mapsCreateResultSchema>;
export type MapsUpdateOut = TypeOf<typeof mapsCreateResultSchema>;

export type AbstractESAggSourceDescriptor = TypeOf<typeof ESAggSourceSchema>;
export type AbstractESJoinSourceDescriptor = TypeOf<typeof ESJoinSourceSchema>;
export type AbstractESSourceDescriptor = TypeOf<typeof ESSourceSchema>;
export type EMSFileSourceDescriptor = TypeOf<typeof EMSFileSourceSchema>;
export type EMSTMSSourceDescriptor = TypeOf<typeof EMSTMSSourceSchema>;
export type ESGeoGridSourceDescriptor = TypeOf<typeof ESGeoGridSourceSchema>;
export type ESGeoLineSourceDescriptor = TypeOf<typeof ESGeoLineSourceSchema>;
export type ESPewPewSourceDescriptor = TypeOf<typeof ESPewPewSourceSchema>;
export type ESSearchSourceDescriptor = TypeOf<typeof ESSearchSourceSchema>;
export type ESDistanceSourceDescriptor = TypeOf<typeof ESDistanceSourceSchema>;
export type ESTermSourceDescriptor = TypeOf<typeof ESTermSourceSchema>;
export type KibanaTilemapSourceDescriptor = TypeOf<typeof KibanaTilemapSourceSchema>;
