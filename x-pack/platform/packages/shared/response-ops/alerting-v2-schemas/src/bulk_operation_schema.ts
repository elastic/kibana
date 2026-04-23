/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import { BULK_FILTER_MAX_RULES } from './constants';

/**
 * Schema for bulk operation request bodies.
 *
 * Either `ids` or at least one of `filter`/`search` must be provided.
 * `ids` cannot be combined with `filter` or `search`.
 */
export const bulkOperationParamsSchema = z
  .object({
    ids: z
      .array(z.string())
      .min(1)
      .max(100)
      .optional()
      .describe('Explicit list of rule IDs to operate on.'),
    filter: z
      .string()
      .optional()
      .describe(
        `KQL filter string to match rules. At most ${BULK_FILTER_MAX_RULES} matching rules are processed per request.`
      ),
    search: z
      .string()
      .optional()
      .describe('Free-text search string to match rules by name and description.'),
  })
  .refine((data) => data.ids != null || data.filter != null || data.search != null, {
    message: 'Either ids, filter, or search must be provided.',
  })
  .refine((data) => data.ids == null || (data.filter == null && data.search == null), {
    message: 'ids cannot be combined with filter or search.',
  });

export type BulkOperationParams = z.infer<typeof bulkOperationParamsSchema>;
