/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';
import { getRandomColor } from '../../../common';

export const tagIdParamSchema = schema.object(
  {
    id: schema.string({
      meta: {
        description: 'The tag identifier, as returned by the create or list endpoints.',
      },
    }),
  },
  {
    unknowns: 'forbid',
    meta: {
      id: 'kbn-tags-id-params',
      title: 'Tag ID parameters',
      description: 'Path parameters for tag routes that operate on a single tag.',
    },
  }
);

export const tagAttributesSchema = schema.object(
  {
    name: schema.string({
      meta: {
        description: 'The display name of the tag.',
      },
    }),
    description: schema.maybe(
      schema.string({
        meta: {
          description: 'Optional description of the tag.',
        },
      })
    ),
    color: schema.string({
      defaultValue: getRandomColor,
      meta: {
        description:
          'The tag color as a hex value (e.g. `#772299`). If omitted, a random color is generated.',
      },
    }),
  },
  {
    unknowns: 'forbid',
    meta: {
      id: 'kbn-tags-attributes',
    },
  }
);

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
