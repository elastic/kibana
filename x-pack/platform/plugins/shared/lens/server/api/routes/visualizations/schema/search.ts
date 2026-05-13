/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { searchOptionsSchemas } from '@kbn/content-management-utils';

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
  page: schema.number({
    meta: {
      description: 'Page number.',
    },
    min: 1,
    defaultValue: 1,
  }),
  per_page: schema.number({
    meta: {
      description: 'Results per page.',
    },
    defaultValue: 20,
    min: 1,
    max: 1000,
  }),
});

const lensSearchResponseMetaSchema = schema.object(
  {
    page: searchOptionsSchemas.page,
    per_page: searchOptionsSchemas.perPage,
    total: schema.number({
      meta: { description: 'Total number of matching visualizations.' },
    }),
  },
  { unknowns: 'forbid' }
);

export const lensSearchResponseBodySchema = schema.object(
  {
    data: schema.arrayOf(lensResponseItemSchema, { maxSize: 1000 }),
    meta: lensSearchResponseMetaSchema,
  },
  { unknowns: 'forbid' }
);
