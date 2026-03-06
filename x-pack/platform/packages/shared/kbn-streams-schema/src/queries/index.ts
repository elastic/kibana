/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { NonEmptyString } from '@kbn/zod-helpers/v4';
import { primitive } from '../shared/record_types';
import type { SignificantEventsResponse } from '../api/significant_events';

export interface EsqlQuery {
  query: string;
}

export const esqlQuerySchema: z.Schema<EsqlQuery> = z.object({
  query: z.string(),
});

interface StreamQueryBase {
  id: string;
  title: string;
}

export interface StreamQuery extends StreamQueryBase {
  esql: EsqlQuery;
  // from 0 to 100. aligned with anomaly detection scoring
  severity_score?: number;
  evidence?: string[];
}

const streamQueryBaseSchema = z.object({
  id: NonEmptyString,
  title: NonEmptyString,
}) satisfies z.Schema<StreamQueryBase>;

export const streamQuerySchema: z.Schema<StreamQuery> = streamQueryBaseSchema.extend({
  severity_score: z.number().optional(),
  evidence: z.array(z.string()).optional(),
  esql: esqlQuerySchema,
});

export const querySchema: z.ZodType<QueryDslQueryContainer> = z.lazy(() =>
  z.record(
    z.string(),
    z.union([primitive, z.array(z.union([primitive, querySchema])), querySchema])
  )
);

export const upsertStreamQueryRequestSchema = z.object({
  title: NonEmptyString,
  esql: esqlQuerySchema,
  severity_score: z.number().optional(),
  evidence: z.array(z.string()).optional(),
});

export interface QueriesGetResponse {
  queries: SignificantEventsResponse[];
  page: number;
  perPage: number;
  total: number;
}

export interface QueriesOccurrencesGetResponse {
  occurrences_histogram: Array<{ x: string; y: number }>;
  total_occurrences: number;
}
