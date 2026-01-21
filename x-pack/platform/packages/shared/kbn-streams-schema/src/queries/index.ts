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
import { createIsNarrowSchema } from '../shared/type_guards';

interface StreamQueryBase {
  id: string;
  title: string;
}

export interface StreamQuery extends StreamQueryBase {
  /**
   * @deprecated Use esql.where instead. Will be removed in a future version.
   */
  feature?: {
    name: string;
    filter: Condition;
    type: 'system';
  };
  /**
   * @deprecated Use esql.where instead. Will be removed in a future version.
   */
  kql: {
    query: string;
  };
  /**
   * ESQL-based query condition. Contains the WHERE clause condition
   * that combines the KQL query with the feature filter.
   */
  esql: {
    where: string;
  };
  // from 0 to 100. aligned with anomaly detection scoring
  severity_score?: number;
  evidence?: string[];
}

const streamQueryBaseSchema: z.Schema<StreamQueryBase> = z.object({
  id: NonEmptyString,
  title: NonEmptyString,
});

export const streamQueryKqlSchema: z.Schema<StreamQuery> = z.intersection(
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
    esql: z.object({
      where: z
        .string()
        .describe(
          'ES|QL WHERE clause condition that combines the KQL query with the feature filter.'
        ),
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
  esql: z.object({
    where: z
      .string()
      .describe(
        'ES|QL WHERE clause condition that combines the KQL query with the feature filter.'
      ),
  }),
  severity_score: z.number().optional(),
  evidence: z.array(z.string()).optional(),
});

export const isStreamQuery = createIsNarrowSchema(streamQuerySchema, streamQueryKqlSchema);
