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

const getCompositeSLOParamsSchema = z.object({
  path: z.object({
    id: compositeSloIdSchema,
  }),
});

const getCompositeSLOResponseSchema = compositeSloBaseDefinitionSchema.extend({
  summary: compositeSloSummarySchema,
  members: z.array(compositeSloMemberSummarySchema),
});

type GetCompositeSLOResponse = z.infer<typeof getCompositeSLOResponseSchema>;

export { getCompositeSLOParamsSchema, getCompositeSLOResponseSchema };
export type { GetCompositeSLOResponse };
