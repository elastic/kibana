/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { primitive } from '../record_types';
import { createIsNarrowSchema } from '../../helpers';

export const STREAM_QUERY_CRITICAL_EVENT = 'critical_event';

export type StreamQueryType = typeof STREAM_QUERY_CRITICAL_EVENT;

interface StreamQueryBase {
  id: string;
  title: string;
  type: StreamQueryType;
}

export interface StreamQueryEsql extends StreamQueryBase {
  esql: {
    query: string;
  };
}

export interface StreamQueryDsl extends StreamQueryBase {
  dsl: {
    query: QueryDslQueryContainer;
  };
}

export type StreamQuery = StreamQueryEsql | StreamQueryDsl;

export interface StreamGetResponseBase {
  dashboards: string[];
  queries: StreamQuery[];
}

export interface StreamUpsertRequestBase {
  dashboards: string[];
  queries: StreamQuery[];
}

const streamQueryBaseSchema: z.Schema<StreamQueryBase> = z.object({
  id: NonEmptyString,
  title: NonEmptyString,
  type: z.literal('critical_event'),
});

export const streamQueryEsqlSchema: z.Schema<StreamQueryEsql> = z.intersection(
  streamQueryBaseSchema,
  z.object({
    esql: z.object({
      query: NonEmptyString,
    }),
  })
);

export const querySchema: z.ZodType<QueryDslQueryContainer> = z.lazy(() =>
  z.record(z.union([primitive, z.array(z.union([primitive, querySchema])), querySchema]))
);

export const streamQueryDslSchema: z.Schema<StreamQueryDsl> = z.intersection(
  streamQueryBaseSchema,
  z.object({
    dsl: z.object({
      query: querySchema,
    }),
  })
);
export const streamQuerySchema: z.Schema<StreamQuery> = z.union([
  streamQueryEsqlSchema,
  streamQueryDslSchema,
]);

export const isStreamQueryEsql = createIsNarrowSchema(streamQuerySchema, streamQueryEsqlSchema);
export const isStreamQueryDsl = createIsNarrowSchema(streamQuerySchema, streamQueryDslSchema);

export const streamUpsertRequestSchemaBase: z.Schema<StreamUpsertRequestBase> = z.object({
  dashboards: z.array(NonEmptyString),
  queries: z.array(streamQuerySchema),
});

export const streamGetResponseSchemaBase: z.Schema<StreamGetResponseBase> = z.object({
  dashboards: z.array(NonEmptyString),
  queries: z.array(streamQuerySchema),
});
