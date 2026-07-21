/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const actionPolicyTagsQuerySchema = z
  .object({
    search: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe('Optional search string used to filter suggested action policy tags.'),
  })
  .describe('Query parameters for action policy tag suggestions.');

export type ActionPolicyTagsQuery = z.infer<typeof actionPolicyTagsQuerySchema>;

export const actionPolicyTagsResponseSchema = z
  .array(z.string())
  .describe('The list of suggested action policy tags.');

export type ActionPolicyTagsResponse = z.infer<typeof actionPolicyTagsResponseSchema>;
