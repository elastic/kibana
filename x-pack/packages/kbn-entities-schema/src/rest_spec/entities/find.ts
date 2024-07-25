/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import rison from '@kbn/rison';
import { entityLatestSchema } from '../../schema/entity';

const searchAfterArraySchema = z.array(z.string().or(z.number()));

export const searchAfterSchema = z
  .string()
  .transform((value: string, ctx: z.RefinementCtx) => {
    try {
      const result = rison.decode(value);
      return searchAfterArraySchema.parse(result);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.message });
    }
    return z.NEVER;
  })
  .or(searchAfterArraySchema);

export const findEntitiesQuerySchema = z.object({
  perPage: z.coerce.number().default(10),
  query: z.optional(z.string()),
  searchAfter: z.optional(searchAfterSchema),
  sortField: z.string().default('entity.displayName.keyword'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});

export type FindEntitiesQuery = z.infer<typeof findEntitiesQuerySchema>;

export const findEntitiesResponseSchema = z.object({
  entities: z.array(entityLatestSchema),
  total: z.number(),
  searchAfter: z.optional(z.string()),
});

export type FindEntitiesResponse = z.infer<typeof findEntitiesResponseSchema>;
