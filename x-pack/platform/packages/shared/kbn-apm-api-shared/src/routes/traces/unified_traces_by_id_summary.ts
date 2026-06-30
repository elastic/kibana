/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import type { FocusedTraceItems } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface UnifiedTracesByIdSummaryResponse {
  traceItems?: FocusedTraceItems;
  summary: { services: number; traceEvents: number; errors: number };
}

export const unifiedTracesByIdSummaryRoute = defineRoute<UnifiedTracesByIdSummaryResponse>()({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}/summary',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: t.intersection([rangeRt, t.partial({ maxTraceItems: toNumberRt, docId: t.string })]),
  }),
});
