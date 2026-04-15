/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import {
  compositeSloBaseDefinitionSchema,
  compositeSloMemberSummarySchema,
  compositeSloSummarySchema,
} from '../../../schema/composite_slo';
import { sloIdSchema } from '../../../schema/slo';

const batchGetCompositeSLOParamsSchema = t.type({
  body: t.type({
    ids: t.array(sloIdSchema),
  }),
});

const batchGetCompositeSLOResponseSchema = t.array(
  t.intersection([
    compositeSloBaseDefinitionSchema,
    t.type({
      summary: compositeSloSummarySchema,
      members: t.array(compositeSloMemberSummarySchema),
    }),
  ])
);

type BatchGetCompositeSLOParams = t.TypeOf<typeof batchGetCompositeSLOParamsSchema.props.body>;
type BatchGetCompositeSLOResponse = t.OutputOf<typeof batchGetCompositeSLOResponseSchema>;

export { batchGetCompositeSLOParamsSchema, batchGetCompositeSLOResponseSchema };
export type { BatchGetCompositeSLOParams, BatchGetCompositeSLOResponse };
