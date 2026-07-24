/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import type { TimeRangeMetadata } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export type TimeRangeMetadataResponse = TimeRangeMetadata;

export const timeRangeMetadataRoute = defineRoute<TimeRangeMetadataResponse>()({
  endpoint: 'GET /internal/apm/time_range_metadata',
  params: z.object({
    query: z
      .object({ useSpanName: BooleanFromString.default(false) })
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});
