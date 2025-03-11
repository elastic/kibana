/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// Connector schema
export const TinesConfigSchema = schema.object({ url: schema.string() });
export const TinesSecretsSchema = schema.object({ email: schema.string(), token: schema.string() });

// Stories action schema
export const TinesStoriesActionParamsSchema = null;
export const TinesStoryObjectSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  published: schema.boolean(),
});
export const TinesStoriesActionResponseSchema = schema.object({
  stories: schema.arrayOf(TinesStoryObjectSchema),
  incompleteResponse: schema.boolean(),
});

// Webhooks action schema
export const TinesWebhooksActionParamsSchema = schema.object({ storyId: schema.number() });
export const TinesWebhookObjectSchema = schema.object({
  id: schema.number(),
  name: schema.string(),
  storyId: schema.number(),
  path: schema.string(),
  secret: schema.string(),
});
export const TinesWebhooksActionResponseSchema = schema.object({
  webhooks: schema.arrayOf(TinesWebhookObjectSchema),
  incompleteResponse: schema.boolean(),
});

// Run action schema
export const TinesRunActionParamsSchema = schema.object({
  webhook: schema.maybe(TinesWebhookObjectSchema),
  webhookUrl: schema.maybe(schema.string()),
  body: schema.string(),
});
export const TinesRunActionResponseSchema = schema.object({}, { unknowns: 'ignore' });
