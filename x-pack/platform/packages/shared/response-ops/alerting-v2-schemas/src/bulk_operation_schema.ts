/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Schema for bulk operation request bodies.
 *
 * Enforces that exactly one of `ids` or `filter` must be provided:
 * - `ids`: An explicit list of rule IDs to operate on (1–100).
 * - `filter`: A KQL filter string to match rules.
 */
export const bulkOperationParamsSchema = z
  .object({
    ids: z
      .array(z.string())
      .min(1)
      .max(100)
      .optional()
      .describe('Explicit list of rule IDs to operate on.'),
    filter: z.string().optional().describe('KQL filter string to match rules.'),
  })
  .refine((data) => data.ids != null || data.filter != null, {
    message: 'Either ids or filter must be provided.',
  })
  .refine((data) => data.ids == null || data.filter == null, {
    message: 'Only one of ids or filter can be provided.',
  });

export type BulkOperationParams = z.infer<typeof bulkOperationParamsSchema>;
