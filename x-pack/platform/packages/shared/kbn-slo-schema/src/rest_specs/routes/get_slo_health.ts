/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloIdSchema, transformHealthSchema } from '../../schema';
import { allOrAnyString } from '../../schema/common';

const fetchSLOHealthResponseSchema = t.array(
  t.type({
    id: sloIdSchema,
    instanceId: allOrAnyString,
    revision: t.number,
    name: t.string,
    health: t.type({
      isProblematic: t.boolean,
      rollup: transformHealthSchema,
      summary: transformHealthSchema,
    }),
  })
);

const fetchSLOHealthParamsSchema = t.type({
  body: t.type({
    list: t.array(t.type({ id: sloIdSchema, instanceId: allOrAnyString })),
  }),
});

type FetchSLOHealthResponse = t.OutputOf<typeof fetchSLOHealthResponseSchema>;
type FetchSLOHealthParams = t.TypeOf<typeof fetchSLOHealthParamsSchema.props.body>;

export { fetchSLOHealthParamsSchema, fetchSLOHealthResponseSchema };
export type { FetchSLOHealthParams, FetchSLOHealthResponse };
