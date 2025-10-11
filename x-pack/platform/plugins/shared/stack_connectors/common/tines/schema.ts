/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

// Connector schema
export const TinesConfigSchema = z.object({ url: z.string() });
export const TinesSecretsSchema = z.object({ email: z.string(), token: z.string() });

// Stories action schema
export const TinesStoriesActionParamsSchema = null;
export const TinesStoryObjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  published: z.boolean(),
});
export const TinesStoriesActionResponseSchema = z.object({
  stories: z.array(TinesStoryObjectSchema),
  incompleteResponse: z.boolean(),
});

// Webhooks action schema
export const TinesWebhooksActionParamsSchema = z.object({ storyId: z.number() });
export const TinesWebhookObjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  storyId: z.number(),
  path: z.string(),
  secret: z.string(),
});
export const TinesWebhooksActionResponseSchema = z.object({
  webhooks: z.array(TinesWebhookObjectSchema),
  incompleteResponse: z.boolean(),
});

// Run action schema
export const TinesRunActionParamsSchema = z.object({
  webhook: TinesWebhookObjectSchema.optional(),
  webhookUrl: z.string().optional(),
  body: z.string(),
});
export const TinesRunActionResponseSchema = z.object({});
