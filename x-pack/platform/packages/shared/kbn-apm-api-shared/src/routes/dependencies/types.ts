/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { environmentSchema } from '@kbn/apm-types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';

export const dependencyChartQuerySchema = z
  .object({
    dependencyName: z.string(),
    spanName: z.string(),
    searchServiceDestinationMetrics: BooleanFromString.default(false),
  })
  .merge(rangeSchema)
  .merge(kuerySchema)
  .merge(environmentSchema)
  .merge(offsetSchema);
