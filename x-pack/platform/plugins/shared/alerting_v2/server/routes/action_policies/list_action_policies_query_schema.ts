/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const sortFieldSchema = z
  .enum(['name', 'createdAt', 'updatedAt'])
  .describe('The available fields to sort action policies by.');

const tagFilterItemSchema = z.string().min(1).max(128);

export const listActionPoliciesQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return. Defaults to 1.'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('The number of action policies to return per page. Defaults to 20.'),
  search: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe('A text string to search across action policy fields.'),
  tags: z
    .union([tagFilterItemSchema, z.array(tagFilterItemSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]).map((t) => t.trim()).filter(Boolean))
    .pipe(z.array(tagFilterItemSchema).max(10))
    .optional()
    .describe('Filter by tags. Accepts a single string or an array.'),
  enabled: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .describe('Filter by enabled status. Accepts the strings true or false.'),
  sortField: sortFieldSchema.optional().describe('The field to sort action policies by.'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('The sort direction.'),
});

export type ListActionPoliciesQuery = z.infer<typeof listActionPoliciesQuerySchema>;
