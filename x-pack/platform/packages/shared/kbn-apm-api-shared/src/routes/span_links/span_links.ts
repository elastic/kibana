/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { processorEventSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface SpanLinksResponse {
  outgoingSpanLinks: SpanLinkDetails[];
  incomingSpanLinks: SpanLinkDetails[];
}

export const spanLinksRoute = defineRoute<SpanLinksResponse>()({
  endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}',
  params: z.object({
    path: z.object({
      traceId: z.string(),
      spanId: z.string(),
    }),
    query: kuerySchema
      .merge(rangeSchema)
      .extend({ processorEvent: processorEventSchema.optional() }),
  }),
});
