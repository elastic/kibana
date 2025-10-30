/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { TinesStoryObjectSchema } from '../../../common/tines/schema';

// Tines response base schema
export const TinesBaseApiResponseSchema = z.object({
  meta: z.object({
    pages: z.coerce.number(),
  }),
});

// Stories action schema
export const TinesStoriesApiResponseSchema = TinesBaseApiResponseSchema.extend({
  stories: z.array(TinesStoryObjectSchema.extend({}).strip()),
});

// Single Webhook action schema
export const TinesWebhookApiResponseSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  type: z.string(),
  story_id: z.coerce.number(),
  options: z.object({
    path: z.string().optional(),
    secret: z.string().optional(),
  }),
});

// Webhooks action schema
export const TinesWebhooksApiResponseSchema = TinesBaseApiResponseSchema.extend({
  agents: z.array(TinesWebhookApiResponseSchema),
});

export const TinesRunApiResponseSchema = z.object({});

export type TinesBaseApiResponse = z.infer<typeof TinesBaseApiResponseSchema>;
export type TinesStoriesApiResponse = z.infer<typeof TinesStoriesApiResponseSchema>;
export type TinesWebhookApiResponse = z.infer<typeof TinesWebhookApiResponseSchema>;
export type TinesWebhooksApiResponse = z.infer<typeof TinesWebhooksApiResponseSchema>;
export type TinesRunApiResponse = z.infer<typeof TinesRunApiResponseSchema>;
