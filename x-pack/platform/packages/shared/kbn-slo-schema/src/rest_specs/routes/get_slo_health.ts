/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { healthStatusSchema, sloIdSchema, stateSchema } from '../../schema';
import { allOrAnyString } from '../../schema/common';

const fetchSLOHealthDataSchema = t.array(
  t.type({
    sloId: sloIdSchema,
    sloRevision: t.number,
    sloName: t.string,
    state: stateSchema,
    health: t.type({
      overall: healthStatusSchema,
      rollup: healthStatusSchema,
      summary: healthStatusSchema,
    }),
  })
);

const fetchSLOHealthResponseSchema = t.type({
  data: fetchSLOHealthDataSchema,
  total: t.number,
  page: t.number,
  perPage: t.number,
});

const fetchSLOHealthParamsSchema = t.type({
  body: t.intersection([
    t.type({
      list: t.array(t.type({ sloId: sloIdSchema, sloInstanceId: allOrAnyString })),
    }),
    t.partial({
      page: t.number,
      perPage: t.number,
      statusFilter: t.union([t.literal('healthy'), t.literal('unhealthy')]),
    }),
  ]),
});

type FetchSLOHealthResponse = t.OutputOf<typeof fetchSLOHealthResponseSchema>;
type FetchSLOHealthParams = t.TypeOf<typeof fetchSLOHealthParamsSchema.props.body>;

export { fetchSLOHealthParamsSchema, fetchSLOHealthResponseSchema };
export type { FetchSLOHealthResponse, FetchSLOHealthParams };
