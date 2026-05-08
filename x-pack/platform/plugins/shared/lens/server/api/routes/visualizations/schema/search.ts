/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  asCodePaginationParamsSchema,
  asCodePaginationResponseMetaSchema,
} from '@kbn/as-code-shared-schemas';
import { lensCMSearchOptionsSchema } from '../../../../content_management';
import { lensResponseItemSchema } from './common';

export const lensSearchRequestQuerySchema = schema.object({
  fields: lensCMSearchOptionsSchema.getPropSchemas().fields,
  search_fields: lensCMSearchOptionsSchema.getPropSchemas().searchFields,
  query: schema.maybe(
    schema.string({
      meta: {
        description: 'Text to match against `search_fields`.',
      },
    })
  ),
  ...asCodePaginationParamsSchema.getPropSchemas(),
});

export const lensSearchResponseBodySchema = schema.object(
  {
    data: schema.arrayOf(lensResponseItemSchema, { maxSize: 100 }),
    meta: asCodePaginationResponseMetaSchema,
  },
  { unknowns: 'forbid' }
);
