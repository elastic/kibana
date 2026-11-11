/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import {
  asCodePaginationParamsSchema,
  asCodePaginationResponseMetaSchema,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';
import { lensResponseItemSchema } from './common';

export const lensSearchRequestQuerySchema = z
  .object({
    fields: z.array(z.string()).max(100).optional().meta({
      description:
        'The saved object fields to include in each result. When omitted, all fields are returned.',
    }),
    search_fields: z
      .union([z.string(), z.array(z.string()).max(100)])
      .optional()
      .meta({
        description:
          'The fields to match the `query` text against. Defaults to `title` when omitted.',
      }),
    query: z.string().optional().meta({
      description: 'Text to match against `search_fields`.',
    }),
    ...asCodePaginationParamsSchema.shape,
  })
  .strict();

export const lensSearchResponseBodySchema = z
  .object({
    data: z.array(lensResponseItemSchema).max(PAGINATION_MAX_SIZE),
    meta: asCodePaginationResponseMetaSchema,
  })
  .strict();
