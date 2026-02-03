/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { searchOptionsSchemas } from '@kbn/content-management-utils';

import { lensCMSearchOptionsSchema } from '../../../../content_management';
import { pickFromObjectSchema } from '../../../../utils';
import { lensResponseItemSchema } from './common';

// TODO cleanup and align search options types with client side options
// TODO align defaults with cm and other schema definitions (i.e. searchOptionsSchemas)
// TODO See if these should be in body or params?
export const lensSearchRequestQuerySchema = schema.object({
  ...lensCMSearchOptionsSchema.getPropSchemas(),
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
  perPage: schema.number({
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
    ...pickFromObjectSchema(searchOptionsSchemas, ['page', 'perPage']),
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
