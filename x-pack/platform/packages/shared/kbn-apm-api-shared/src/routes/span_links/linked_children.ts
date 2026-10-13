/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';
import { MAX_FIELD_VALUE_LENGTH } from '../../constants';

export interface LinkedChildrenResponse {
  spanLinksDetails: SpanLinkDetails[];
}

export const linkedChildrenRoute = defineRoute<LinkedChildrenResponse>()({
  endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/children',
  params: lazySchema(() =>
    z.object({
      path: z.object({
        traceId: z.string().max(MAX_FIELD_VALUE_LENGTH),
        spanId: z.string().max(MAX_FIELD_VALUE_LENGTH),
      }),
      query: kuerySchema.merge(rangeSchema),
    })
  ),
});
