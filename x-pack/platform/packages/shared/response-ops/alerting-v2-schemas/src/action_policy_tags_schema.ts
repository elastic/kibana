/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { tagsResponseSchema } from './common';

export const actionPolicyTagsQuerySchema = z
  .object({
    search: z
      .string()
      .max(256)
      .optional()
      .describe('Prefix to filter tags by. Returns all most-used tags when omitted.'),
  })
  .strict()
  .describe('Query parameters for the action policy tags API.');

export type ActionPolicyTagsQuery = z.infer<typeof actionPolicyTagsQuerySchema>;

export const actionPolicyTagsResponseSchema = tagsResponseSchema.describe(
  'All unique tags across action policies.'
);

export type ActionPolicyTagsResponse = z.infer<typeof actionPolicyTagsResponseSchema>;
