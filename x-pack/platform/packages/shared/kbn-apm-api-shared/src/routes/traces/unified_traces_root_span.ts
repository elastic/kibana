/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { TraceRootSpan } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export type UnifiedTracesRootSpanResponse = TraceRootSpan;

export const unifiedTracesRootSpanRoute = defineRoute<UnifiedTracesRootSpanResponse>()({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}/root_span',
  params: z.object({
    path: z.object({
      traceId: z.string(),
    }),
    query: rangeSchema,
  }),
});
