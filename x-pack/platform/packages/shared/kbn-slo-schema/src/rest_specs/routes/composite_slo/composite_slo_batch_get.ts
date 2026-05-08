/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import {
  compositeSloIdSchema,
  compositeSloBaseDefinitionSchema,
  compositeSloMemberSummarySchema,
  compositeSloSummarySchema,
} from '../../../schema/composite_slo';

const batchGetCompositeSLOParamsSchema = z.object({
  body: z.object({
    ids: z.array(compositeSloIdSchema).min(1).max(100),
  }),
});

const batchGetCompositeSLOResponseSchema = z.array(
  compositeSloBaseDefinitionSchema.extend({
    summary: compositeSloSummarySchema,
    members: z.array(compositeSloMemberSummarySchema),
  })
);

type BatchGetCompositeSLOParams = z.infer<typeof batchGetCompositeSLOParamsSchema.shape.body>;
type BatchGetCompositeSLOResponse = z.infer<typeof batchGetCompositeSLOResponseSchema>;

export { batchGetCompositeSLOParamsSchema, batchGetCompositeSLOResponseSchema };
export type { BatchGetCompositeSLOParams, BatchGetCompositeSLOResponse };
