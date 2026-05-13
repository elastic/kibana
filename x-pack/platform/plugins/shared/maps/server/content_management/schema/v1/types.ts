/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  mapsGetResultSchema,
  mapsCreateOptionsSchema,
  mapsCreateResultSchema,
  mapsSearchOptionsSchema,
  mapsUpdateOptionsSchema,
} from './cm_services';

export type MapsCreateOptions = z.output<typeof mapsCreateOptionsSchema>;
export type MapsUpdateOptions = z.output<typeof mapsUpdateOptionsSchema>;
export type MapsSearchOptions = z.output<typeof mapsSearchOptionsSchema>;

export type MapsGetOut = z.output<typeof mapsGetResultSchema>;
export type MapsCreateOut = z.output<typeof mapsCreateResultSchema>;
export type MapsUpdateOut = z.output<typeof mapsCreateResultSchema>;
