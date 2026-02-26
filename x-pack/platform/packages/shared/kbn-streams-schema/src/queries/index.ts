/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { NonEmptyString } from '@kbn/zod-helpers';
import type { Condition } from '@kbn/streamlang';
import { conditionSchema } from '@kbn/streamlang';
import { primitive } from '../shared/record_types';
import type { SignificantEventsResponse } from '../api/significant_events';

interface StreamQueryBase {
  id: string;
  title: string;
}

export interface StreamQuery extends StreamQueryBase {
  /**
   * @deprecated Use esql.query instead. Will be removed in a future version.
   */
  feature?: {
    name: string;
    filter: Condition;
    type: 'system';
  };
  /**
   * @deprecated Use esql.query instead. Will be removed in a future version.
   */
  kql: {
    query: string;
  };
  /**
   * Full ES|QL query built from the stream indices, KQL query, and feature filter.
   * Example: FROM stream,stream.* | WHERE KQL("message: error")
   */
  esql: {
    query: string;
  };
  // from 0 to 100. aligned with anomaly detection scoring
  severity_score?: number;
  evidence?: string[];
}

const streamQueryBaseSchema: z.Schema<StreamQueryBase> = z.object({
  id: NonEmptyString,
  title: NonEmptyString,
});

export type StreamQueryInput = Omit<StreamQuery, 'esql'>;

export const streamQueryInputSchema: z.Schema<StreamQueryInput> = z.intersection(
  streamQueryBaseSchema,
  z.object({
    feature: z
      .object({
        name: NonEmptyString,
        filter: conditionSchema,
        type: z.literal('system'),
      })
      .optional(),
    kql: z.object({
      query: z.string(),
    }),
    severity_score: z.number().optional(),
    evidence: z.array(z.string()).optional(),
  })
);

export const streamQuerySchema: z.Schema<StreamQuery> = z.intersection(
  streamQueryInputSchema,
  z.object({
    esql: z.object({
      query: z.string().describe('Full ES|QL query.'),
    }),
  })
);

export const querySchema: z.ZodType<QueryDslQueryContainer> = z.lazy(() =>
  z.record(z.union([primitive, z.array(z.union([primitive, querySchema])), querySchema]))
);

export const upsertStreamQueryRequestSchema = z.object({
  title: NonEmptyString,
  feature: z
    .object({
      name: NonEmptyString,
      filter: conditionSchema,
      type: z.literal('system'),
    })
    .optional(),
  kql: z.object({
    query: z.string(),
  }),
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
