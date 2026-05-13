/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { lensResponseItemSchema } from './common';

export const lensSearchRequestQuerySchema = z.object({
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
  page: z.coerce.number().min(1).default(1).meta({
    description: 'Page number.',
  }),
  per_page: z.coerce.number().min(1).max(1000).default(20).meta({
    description: 'Results per page.',
  }),
});

const lensSearchResponseMetaSchema = z
  .object({
    page: z.number().optional(),
    per_page: z.number().optional(),
    total: z.number().meta({ description: 'Total number of matching visualizations.' }),
  })
  .strict();

export const lensSearchResponseBodySchema = z
  .object({
    data: z.array(lensResponseItemSchema).max(1000),
    meta: lensSearchResponseMetaSchema,
  })
  .strict();
