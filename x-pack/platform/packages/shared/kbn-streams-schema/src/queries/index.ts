/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Condition } from '@kbn/streamlang';
import { conditionSchema } from '@kbn/streamlang';
import { primitive } from '../shared/record_types';
import { createIsNarrowSchema } from '../shared/type_guards';

interface StreamQueryBase {
  id: string;
  title: string;
}

export interface StreamQueryKql extends StreamQueryBase {
  feature?: {
    name: string;
    filter: Condition;
    type: 'system';
  };
  kql: {
    query: string;
  };
  // from 0 to 100. aligned with anomaly detection scoring
  severity_score?: number;
  evidence?: string[];
}

export type StreamQuery = StreamQueryKql;

const streamQueryBaseSchema: z.Schema<StreamQueryBase> = z.object({
  id: z
    .string()
    .nonempty()
    .refine((val) => val.trim() !== '', 'No empty strings allowed'),
  title: z
    .string()
    .nonempty()
    .refine((val) => val.trim() !== '', 'No empty strings allowed'),
});

export const streamQueryKqlSchema: z.Schema<StreamQueryKql> = z.intersection(
  streamQueryBaseSchema,
  z.object({
    feature: z
      .object({
        name: z
          .string()
          .nonempty()
          .refine((val) => val.trim() !== '', 'No empty strings allowed'),
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

export const querySchema: z.ZodType<QueryDslQueryContainer> = z.lazy(() =>
  z.record(z.union([primitive, z.array(z.union([primitive, querySchema])), querySchema]))
);

export const streamQuerySchema: z.Schema<StreamQuery> = streamQueryKqlSchema;

export const upsertStreamQueryRequestSchema = z.object({
  title: z
    .string()
    .nonempty()
    .refine((val) => val.trim() !== '', 'No empty strings allowed'),
  feature: z
    .object({
      name: z
        .string()
        .nonempty()
        .refine((val) => val.trim() !== '', 'No empty strings allowed'),
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

export const isStreamQueryKql = createIsNarrowSchema(streamQuerySchema, streamQueryKqlSchema);
