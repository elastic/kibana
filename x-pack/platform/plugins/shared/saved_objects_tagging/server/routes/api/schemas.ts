/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  asCodeMetaSchema,
  asCodePaginationParamsSchema,
  asCodePaginationResponseMetaSchema,
  PAGINATION_MAX_SIZE,
} from '@kbn/as-code-shared-schemas';

export const tagsSearchRequestQuerySchema = z
  .object({
    query: z.string().optional().meta({
      description:
        'Filters results by `name` and `description` using Elasticsearch [`simple_query_string`](https://www.elastic.co/docs/reference/query-languages/query-dsl/simple-query-string-query) syntax. Multi-word terms require all words to match.',
    }),
    ...asCodePaginationParamsSchema.shape,
  })
  .strict();

export const tagIdParamSchema = z
  .object({
    id: z.string().meta({
      description: 'The tag ID, as returned by the create or search endpoints.',
    }),
  })
  .strict();

export const tagAttributesSchema = z
  .object({
    name: z.string().meta({
      description: 'The display name of the tag.',
    }),
    description: z.string().optional().meta({
      description: 'Optional description of the tag.',
    }),
    color: z.string().meta({
      description:
        'The tag color as a hex value (e.g. `#772299`). If omitted, a random color is generated.',
    }),
  })
  .strict()
  .meta({
    id: 'kbn-tags-attributes',
  });

export const tagRequestAttributesSchema = tagAttributesSchema
  .extend({
    color: z.string().optional().meta({
      description:
        'The tag color as a hex value (e.g. `#772299`). If omitted, a random color is generated.',
    }),
  })
  .strict()
  .meta({
    id: 'kbn-tags-request-attributes',
  });

export const tagResponseItemSchema = z
  .object({
    id: z.string().meta({ description: 'The tag ID.' }),
    data: tagAttributesSchema,
    meta: asCodeMetaSchema,
  })
  .strict();

export const tagsSearchResponseBodySchema = z
  .object({
    data: z
      .array(tagResponseItemSchema)
      .min(0)
      .max(PAGINATION_MAX_SIZE)
      .meta({ description: 'List of tags matching the query.' }),
    meta: asCodePaginationResponseMetaSchema,
  })
  .strict();

export type TagResponseItem = z.output<typeof tagResponseItemSchema>;
export type TagsSearchResponseBody = z.output<typeof tagsSearchResponseBodySchema>;
export type TagsSearchRequestQuery = z.output<typeof tagsSearchRequestQuerySchema>;
