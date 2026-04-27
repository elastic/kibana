/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';

export const tagIdParamSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The tag ID.',
    },
  }),
});

export const tagAttributesSchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  color: schema.string(),
});

export const tagResponseItemSchema = schema.object(
  {
    id: schema.string(),
    data: tagAttributesSchema,
    meta: asCodeMetaSchema,
  },
  { unknowns: 'forbid' }
);

export const tagsListResponseBodySchema = schema.object(
  {
    tags: schema.arrayOf(tagResponseItemSchema, { minSize: 0, maxSize: 10000 }),
    total: schema.number(),
    page: schema.number(),
  },
  { unknowns: 'forbid' }
);

export type TagResponseItem = TypeOf<typeof tagResponseItemSchema>;
export type TagsListResponseBody = TypeOf<typeof tagsListResponseBodySchema>;
