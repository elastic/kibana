/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';
import { allOrAnyString } from '../../schema/common';
import { sloIdSchema } from '../../schema/slo';
import { sloWithDataResponseSchema } from '../slo';

const getSLOQuerySchema = lazySchema(() =>
  z.object({
    instanceId: allOrAnyString
      .optional()
      .describe('the specific instanceId used by the summary calculation'),
    remoteName: z
      .string()
      .optional()
      .describe('The name of the remote cluster where the SLO is defined, for remote SLOs'),
  })
);

const getSLOParamsSchema = z.object({
  path: z.object({
    id: sloIdSchema,
  }),
  query: getSLOQuerySchema.optional(),
});

const getSLOResponseSchema = sloWithDataResponseSchema;

type GetSLOParams = z.output<typeof getSLOQuerySchema>;
type GetSLOResponse = z.input<typeof getSLOResponseSchema>;

export { getSLOParamsSchema, getSLOResponseSchema };
export type { GetSLOParams, GetSLOResponse };
