/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface LinkedChildrenResponse {
  spanLinksDetails: SpanLinkDetails[];
}

export const linkedChildrenRoute = defineRoute<LinkedChildrenResponse>()({
  endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/children',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt]),
  }),
});
