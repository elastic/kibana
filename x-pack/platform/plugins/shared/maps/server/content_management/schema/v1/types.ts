/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Writable } from '@kbn/utility-types';
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
  ESGeoGridSourceSchema,
  ESGeoLineSourceSchema,
  ESSourceSchema,
} from './source_schemas';

export type MapsSavedObjectAttributes = TypeOf<typeof mapAttributesSchema>;

export type MapsCreateOptions = TypeOf<typeof mapsCreateOptionsSchema>;
export type MapsUpdateOptions = TypeOf<typeof mapsUpdateOptionsSchema>;
export type MapsSearchOptions = TypeOf<typeof mapsSearchOptionsSchema>;

export type MapsGetOut = TypeOf<typeof mapsGetResultSchema>;
export type MapsCreateOut = TypeOf<typeof mapsCreateResultSchema>;
export type MapsUpdateOut = TypeOf<typeof mapsCreateResultSchema>;

export type AbstractESAggSourceDescriptor = Writable<TypeOf<typeof ESAggSourceSchema>>;
export type AbstractESSourceDescriptor = Writable<TypeOf<typeof ESSourceSchema>>;
export type EMSFileSourceDescriptor = Writable<TypeOf<typeof EMSFileSourceSchema>>;
export type EMSTMSSourceDescriptor = Writable<TypeOf<typeof EMSTMSSourceSchema>>;
export type ESGeoGridSourceDescriptor = Writable<TypeOf<typeof ESGeoGridSourceSchema>>;
export type ESGeoLineSourceDescriptor = Writable<TypeOf<typeof ESGeoLineSourceSchema>>;
