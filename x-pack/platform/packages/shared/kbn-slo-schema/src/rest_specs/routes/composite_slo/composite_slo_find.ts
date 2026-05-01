/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { compositeSloDefinitionSchema, compositeStatusSchema } from '../../../schema/composite_slo';

const compositeSortDirectionSchema = z.union([z.literal('asc'), z.literal('desc')]);
const compositeSortBySchema = z.union([
  z.literal('name'),
  z.literal('createdAt'),
  z.literal('updatedAt'),
]);

const compositeStatusFilterSchema = z
  .string()
  .transform((raw) => raw.split(',').map((s) => s.trim()))
  .pipe(z.array(compositeStatusSchema).min(1));

const findCompositeSLOQuerySchema = z.object({
  search: z.string().optional(),
  page: z.string().optional(),
  perPage: z.string().optional(),
  sortBy: compositeSortBySchema.optional(),
  sortDirection: compositeSortDirectionSchema.optional(),
  tags: z.string().optional(),
  status: compositeStatusFilterSchema.optional(),
});

const findCompositeSLOParamsSchema = z.object({
  query: findCompositeSLOQuerySchema.optional(),
});

const findCompositeSLOResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  results: z.array(compositeSloDefinitionSchema),
});

type FindCompositeSLOParams = z.infer<typeof findCompositeSLOQuerySchema>;
type FindCompositeSLOResponse = z.infer<typeof findCompositeSLOResponseSchema>;

export { findCompositeSLOParamsSchema, findCompositeSLOResponseSchema };
export type { FindCompositeSLOParams, FindCompositeSLOResponse };
