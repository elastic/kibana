/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { NonEmptyString } from '@kbn/zod-helpers';
import { primitive } from '../shared/record_types';
import { createIsNarrowSchema } from '../shared/type_guards';

interface StreamQueryBase {
  id: string;
  title: string;
}

export interface StreamQueryKql extends StreamQueryBase {
  kql: {
    query: string;
  };
}

export type StreamQuery = StreamQueryKql;

const streamQueryBaseSchema: z.Schema<StreamQueryBase> = z.object({
  id: NonEmptyString,
  title: NonEmptyString,
});

export const streamQueryKqlSchema: z.Schema<StreamQueryKql> = z.intersection(
  streamQueryBaseSchema,
  z.object({
    kql: z.object({
      query: z.string(),
    }),
  })
);

export const querySchema: z.ZodType<QueryDslQueryContainer> = z.lazy(() =>
  z.record(z.union([primitive, z.array(z.union([primitive, querySchema])), querySchema]))
);

export const streamQuerySchema: z.Schema<StreamQuery> = streamQueryKqlSchema;

export const upsertStreamQueryRequestSchema = z.object({
  title: NonEmptyString,
  kql: z.object({
    query: z.string(),
  }),
});

export const isStreamQueryKql = createIsNarrowSchema(streamQuerySchema, streamQueryKqlSchema);
