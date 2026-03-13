/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { searchOptionsSchemas } from '@kbn/content-management-utils';

import { lensCMSearchOptionsSchema } from '../../../../content_management';
import { lensResponseItemSchema } from './common';

export const lensSearchRequestQuerySchema = schema.object({
  fields: lensCMSearchOptionsSchema.getPropSchemas().fields,
  search_fields: lensCMSearchOptionsSchema.getPropSchemas().searchFields,
  query: schema.maybe(
    schema.string({
      meta: {
        description: 'The text to search for Lens visualizations',
      },
    })
  ),
  page: schema.number({
    meta: {
      description: 'Specifies the current page number of the paginated result.',
    },
    min: 1,
    defaultValue: 1,
  }),
  per_page: schema.number({
    meta: {
      description: 'Maximum number of Lens visualizations included in a single response',
    },
    defaultValue: 20,
    min: 1,
    max: 1000,
  }),
});

const lensSearchResponseMetaSchema = schema.object(
  {
    page: searchOptionsSchemas.page,
    perPage: searchOptionsSchemas.perPage,
    total: schema.number(), // TODO use shared definition
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
