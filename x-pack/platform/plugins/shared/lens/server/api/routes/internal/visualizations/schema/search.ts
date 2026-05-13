/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { searchOptionsSchema } from '@kbn/content-management-utils/zod';

import { lensCMSearchOptionsSchema } from '../../../../../content_management/zod';
import { lensResponseItemSchema } from './common';

// TODO cleanup and align search options types with client side options
// TODO align defaults with cm and other schema definitions (i.e. searchOptionsSchemas)
// TODO See if these should be in body or params?
export const lensSearchRequestQuerySchema = lensCMSearchOptionsSchema
  .extend({
    query: z.string().optional().meta({
      description: 'The text to search for visualizations',
    }),
    page: z.coerce.number().min(1).default(1).meta({
      description: 'Specifies the current page number of the paginated result.',
    }),
    perPage: z.coerce.number().min(1).max(1000).default(20).meta({
      description: 'Maximum number of visualizations included in a single response',
    }),
  })
  .strict();

const lensSearchResponseMetaSchema = searchOptionsSchema
  .pick({
    page: true,
    perPage: true,
  })
  .extend({
    total: z.number(), // TODO use shared definition
  })
  .strict();

export const lensSearchResponseBodySchema = z
  .object({
    data: z.array(lensResponseItemSchema).max(100),
    meta: lensSearchResponseMetaSchema,
  })
  .strict()
  .meta({ id: 'visualizationListResponse' });
