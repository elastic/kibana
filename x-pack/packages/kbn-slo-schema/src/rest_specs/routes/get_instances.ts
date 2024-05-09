/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const getSLOInstancesParamsSchema = t.type({
  path: t.type({ id: t.string }),
});

const getSLOInstancesResponseSchema = t.type({
  groupBy: t.union([t.string, t.array(t.string)]),
  instances: t.array(t.string),
});

type GetSLOInstancesResponse = t.OutputOf<typeof getSLOInstancesResponseSchema>;

export { getSLOInstancesParamsSchema, getSLOInstancesResponseSchema };
export type { GetSLOInstancesResponse };
