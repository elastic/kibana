/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { compositeStatusSchema } from '../../../schema/composite_slo';

const findCompositeSLODefinitionsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  perPage: z.coerce.number().min(1).max(1000).optional(),
  sortBy: z.union([z.literal('name'), z.literal('createdAt'), z.literal('updatedAt')]).optional(),
  sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
  tags: z
    .string()
    .transform((raw) => raw.split(',').map((s) => s.trim()))
    .optional(),
  status: z
    .string()
    .transform((raw) => raw.split(',').map((s) => s.trim()))
    .pipe(z.array(compositeStatusSchema).min(1))
    .optional(),
});

const findCompositeSLODefinitionsParamsSchema = z.object({
  query: findCompositeSLODefinitionsQuerySchema.optional(),
});

type FindCompositeSLODefinitionsParams = z.infer<typeof findCompositeSLODefinitionsQuerySchema>;

export { findCompositeSLODefinitionsParamsSchema };
export type { FindCompositeSLODefinitionsParams };
