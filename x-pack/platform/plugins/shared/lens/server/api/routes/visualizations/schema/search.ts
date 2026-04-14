/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { lensResponseItemSchema } from './common';

// Request query and response meta fields are defined inline so that descriptions
// render in the generated OAS. The shared searchOptionsSchemas don't carry
// descriptions, and .extendsDeep() on maybe()-wrapped schemas doesn't propagate
// them into the OAS output.
export const lensSearchRequestQuerySchema = schema.object({
  fields: schema.maybe(
    schema.arrayOf(schema.string(), {
      meta: {
        description:
          'Attributes to include in each result. Defaults to all fields. Valid values: `title`, `description`, `visualizationType`, `state`, `version`.',
      },
    })
  ),
  search_fields: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
      meta: {
        description:
          'Attributes to search within when `query` is set. Valid values: `title`, `description`, `visualizationType`. Defaults to `title` and `description`.',
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
    page: schema.maybe(
      schema.number({
        meta: { description: 'Current page number.' },
      })
    ),
    per_page: schema.maybe(
      schema.number({
        meta: { description: 'Number of results per page.' },
      })
    ),
    total: schema.number({
      meta: { description: 'Total number of matching visualizations.' },
    }),
  },
  { unknowns: 'forbid' }
);

export const lensSearchResponseBodySchema = schema.object(
  {
    data: schema.arrayOf(lensResponseItemSchema, { maxSize: 100 }),
    meta: lensSearchResponseMetaSchema,
  },
  { unknowns: 'forbid' }
);
