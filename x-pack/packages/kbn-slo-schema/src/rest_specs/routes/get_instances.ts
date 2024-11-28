/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const getSLOInstancesParamsSchema = t.type({
  path: t.type({ id: t.string }),
  query: t.union([
    t.undefined,
    t.partial({
      groupingKey: t.string,
      search: t.string,
      afterKey: t.string,
      size: t.string,
    }),
  ]),
});

const getSLOInstancesResponseSchema = t.type({
  results: t.array(
    t.type({
      groupingKey: t.string,
      values: t.array(t.string),
      afterKey: t.union([t.string, t.undefined]),
    })
  ),
});

type GetSLOInstancesParams = t.TypeOf<typeof getSLOInstancesParamsSchema.props.query>;
type GetSLOInstancesResponse = t.OutputOf<typeof getSLOInstancesResponseSchema>;

export { getSLOInstancesParamsSchema, getSLOInstancesResponseSchema };
export type { GetSLOInstancesResponse, GetSLOInstancesParams };
