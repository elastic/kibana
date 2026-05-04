/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';

export const tagsListRequestQuerySchema = schema.object({
  query: schema.maybe(
    schema.string({
      meta: {
        description:
          'Filters results by `name` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/simple-query-string-query) syntax. Multi-word terms require all words to match.',
      },
    })
  ),
  page: schema.maybe(
    schema.number({
      min: 1,
      meta: {
        description: 'The page of results to return. Defaults to `1`.',
      },
    })
  ),
  per_page: schema.maybe(
    schema.number({
      min: 1,
      max: 1000,
      meta: {
        description: 'The number of results to return per page. Defaults to `20`.',
      },
    })
  ),
});

export const tagIdParamSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The tag ID, as returned by the create or search endpoints.',
    },
  }),
});

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

const tagAttributesProps = tagAttributesSchema.getPropSchemas();

export const tagRequestAttributesSchema = schema.object(
  {
    ...tagAttributesProps,
    color: schema.maybe(tagAttributesProps.color),
  },
  {
    unknowns: 'forbid',
    meta: {
      id: 'kbn-tags-request-attributes',
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

const tagsListResponseMetaSchema = schema.object(
  {
    page: schema.number({
      meta: { description: 'The current page number.' },
    }),
    per_page: schema.number({
      meta: { description: 'The number of results returned per page.' },
    }),
    total: schema.number({
      meta: { description: 'The total number of tags matching the query.' },
    }),
  },
  { unknowns: 'forbid' }
);

export const tagsListResponseBodySchema = schema.object(
  {
    data: schema.arrayOf(tagResponseItemSchema, { minSize: 0, maxSize: 1000 }),
    meta: tagsListResponseMetaSchema,
  },
  { unknowns: 'forbid' }
);

export type TagResponseItem = TypeOf<typeof tagResponseItemSchema>;
export type TagsListResponseBody = TypeOf<typeof tagsListResponseBodySchema>;
export type TagsListRequestQuery = TypeOf<typeof tagsListRequestQuerySchema>;
