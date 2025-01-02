/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { TinesStoryObjectSchema } from '../../../common/tines/schema';

// Tines response base schema
export const TinesBaseApiResponseSchema = schema.object(
  {
    meta: schema.object(
      {
        pages: schema.number(),
      },
      { unknowns: 'ignore' }
    ),
  },
  { unknowns: 'ignore' }
);

// Stories action schema
export const TinesStoriesApiResponseSchema = TinesBaseApiResponseSchema.extends(
  {
    stories: schema.arrayOf(TinesStoryObjectSchema.extends({}, { unknowns: 'ignore' })),
  },
  { unknowns: 'ignore' }
);

// Webhooks action schema
export const TinesWebhooksApiResponseSchema = TinesBaseApiResponseSchema.extends(
  {
    agents: schema.arrayOf(
      schema.object(
        {
          id: schema.number(),
          name: schema.string(),
          type: schema.string(),
          story_id: schema.number(),
          options: schema.object(
            {
              path: schema.maybe(schema.string()),
              secret: schema.maybe(schema.string()),
            },
            { unknowns: 'ignore' }
          ),
        },
        { unknowns: 'ignore' }
      )
    ),
  },
  { unknowns: 'ignore' }
);

export const TinesRunApiResponseSchema = schema.object({}, { unknowns: 'ignore' });

export type TinesBaseApiResponse = TypeOf<typeof TinesBaseApiResponseSchema>;
export type TinesStoriesApiResponse = TypeOf<typeof TinesStoriesApiResponseSchema>;
export type TinesWebhooksApiResponse = TypeOf<typeof TinesWebhooksApiResponseSchema>;
export type TinesRunApiResponse = TypeOf<typeof TinesRunApiResponseSchema>;
