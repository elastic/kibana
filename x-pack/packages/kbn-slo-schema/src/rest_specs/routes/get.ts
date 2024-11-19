/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { allOrAnyString } from '../../schema/common';
import { sloIdSchema } from '../../schema/slo';
import { sloWithDataResponseSchema } from '../slo';

const getSLOQuerySchema = t.partial({
  query: t.partial({
    instanceId: allOrAnyString,
    remoteName: t.string,
  }),
});

const getSLOParamsSchema = t.intersection([
  t.type({
    path: t.type({
      id: sloIdSchema,
    }),
  }),
  getSLOQuerySchema,
]);

const getSLOResponseSchema = sloWithDataResponseSchema;

type GetSLOParams = t.TypeOf<typeof getSLOQuerySchema.props.query>;
type GetSLOResponse = t.OutputOf<typeof getSLOResponseSchema>;

export { getSLOParamsSchema, getSLOResponseSchema };
export type { GetSLOParams, GetSLOResponse };
