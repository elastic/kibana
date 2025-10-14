/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  TinesConfigSchema,
  TinesSecretsSchema,
  TinesRunActionParamsSchema,
  TinesRunActionResponseSchema,
  TinesStoriesActionResponseSchema,
  TinesWebhooksActionResponseSchema,
  TinesWebhooksActionParamsSchema,
  TinesWebhookObjectSchema,
  TinesWebhookActionConfigSchema,
  TinesStoryObjectSchema,
} from './schema';

export type TinesConfig = z.infer<typeof TinesConfigSchema>;
export type TinesSecrets = z.infer<typeof TinesSecretsSchema>;
export type TinesRunActionParams = z.infer<typeof TinesRunActionParamsSchema>;
export type TinesRunActionResponse = z.infer<typeof TinesRunActionResponseSchema>;
export type TinesStoriesActionParams = void;
export type TinesStoryObject = z.infer<typeof TinesStoryObjectSchema>;
export type TinesStoriesActionResponse = z.infer<typeof TinesStoriesActionResponseSchema>;
export type TinesWebhooksActionParams = z.infer<typeof TinesWebhooksActionParamsSchema>;
export type TinesWebhooksActionResponse = z.infer<typeof TinesWebhooksActionResponseSchema>;
export type TinesWebhookActionConfig = z.infer<typeof TinesWebhookActionConfigSchema>;
export type TinesWebhookObject = z.infer<typeof TinesWebhookObjectSchema>;
