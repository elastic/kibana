/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

<<<<<<< HEAD
import {
  asCodePaginationParamsSchema,
  asCodePaginationResponseMetaSchema,
} from '@kbn/as-code-shared-schemas';
import { lensCMSearchOptionsSchema } from '../../../../content_management';
=======
>>>>>>> a5a7bbc1ba1371aa998cebadd4e0e2790d628a2c
import { lensResponseItemSchema } from './common';

export const lensSearchRequestQuerySchema = schema.object({
  fields: schema.maybe(
    schema.arrayOf(schema.string(), {
      meta: {
        description:
          'The saved object fields to include in each result. When omitted, all fields are returned.',
      },
      maxSize: 100,
    })
  ),
  search_fields: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
      meta: {
        description:
          'The fields to match the `query` text against. Defaults to `title` when omitted.',
      },
    })
  ),
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
    data: schema.arrayOf(lensResponseItemSchema, { maxSize: 1000 }),
    meta: asCodePaginationResponseMetaSchema,
  },
  { unknowns: 'forbid' }
);
