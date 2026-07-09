/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { processorEventSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface EventMetadataResponse {
  metadata: Partial<Record<string, unknown[]>>;
}

export const eventMetadataRoute = defineRoute<EventMetadataResponse>()({
  endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
  params: z.object({
    path: z.object({
      processorEvent: processorEventSchema,
      id: z.string(),
    }),
    query: rangeSchema,
  }),
});
