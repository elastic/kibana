/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { querySchema } from '@kbn/es-query-server';
import { SOURCE_TYPES } from '../../../../../common';
import { BaseESAggSourceSchema } from './es_agg_source_schemas';

export const ESJoinSourceSchema = BaseESAggSourceSchema.extend({
  type: z.string(),
  whereQuery: querySchema.optional(),
});

export const ESDistanceSourceSchema = ESJoinSourceSchema.extend({
  distance: z.number(),
  geoField: z.string(),
  type: z.literal(SOURCE_TYPES.ES_DISTANCE_SOURCE),
});

export const ESTermSourceSchema = ESJoinSourceSchema.extend({
  size: z.number().min(1).optional(),
  term: z.string(),
  type: z.literal(SOURCE_TYPES.ES_TERM_SOURCE),
});

export const joinSourceSchema = z.union([
  z
    .object({
      id: z.string(),
      type: z.string(),
    })
    .loose(),
  ESDistanceSourceSchema,
  ESTermSourceSchema,
]);
