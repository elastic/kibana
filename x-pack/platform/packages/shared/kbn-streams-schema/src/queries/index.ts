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

export const streamQueryTypeSchema = z.enum(['match', 'stats']).optional();
export const streamQueryCategorySchema = z
  .enum(['operational', 'error', 'resource_health', 'configuration', 'security'])
  .optional();
export const streamQuerySourceSchema = z
  .enum(['ai_generated', 'user_created', 'predefined'])
  .optional();

export type StreamQueryType = z.infer<typeof streamQueryTypeSchema>;
export type StreamQueryCategory = z.infer<typeof streamQueryCategorySchema>;
export type StreamQuerySource = z.infer<typeof streamQuerySourceSchema>;

export interface StreamQuery extends StreamQueryBase {
  affected_streams: string[];
  esql: EsqlQuery;
  // from 0 to 100. aligned with anomaly detection scoring
  severity_score?: number;
  evidence?: string[];
  description?: string;
  type?: StreamQueryType;
  category?: StreamQueryCategory;
  tags?: string[];
  source?: StreamQuerySource;
  model?: string;
  created_at?: string;
  updated_at?: string;
}

const streamQueryBaseSchema = z.object({
  id: NonEmptyString,
  title: NonEmptyString,
}) satisfies z.Schema<StreamQueryBase>;

export const streamQuerySchema: z.Schema<StreamQuery> = streamQueryBaseSchema.extend({
  affected_streams: z.array(z.string()),
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
  description: z.string().optional(),
  type: streamQueryTypeSchema,
  category: streamQueryCategorySchema,
  tags: z.array(z.string()).optional(),
  source: streamQuerySourceSchema,
  model: z.string().optional(),
});

export type RuleUnbackedFilter = 'exclude' | 'include' | 'only';

export interface QueryLinkFilters {
  ruleUnbacked?: RuleUnbackedFilter;
}

export interface GetQueriesFilters {
  streamName?: string | string[];
  type?: StreamQueryType[];
  category?: StreamQueryCategory[];
  source?: StreamQuerySource[];
  search?: string;
  ruleUnbacked?: RuleUnbackedFilter;
}

export interface QueryRuleOccurrencesHistogramBucket {
  date: string;
  count: number;
}

export interface QueryRuleOccurrences {
  buckets: QueryRuleOccurrencesHistogramBucket[];
  total: number;
}

export interface QueriesGetResponse {
  queries: StreamQuery[];
  unbacked: string[];
  page: number;
  perPage: number;
  total: number;
}

export type QueriesOccurrencesGetResponse = QueryRuleOccurrences;
