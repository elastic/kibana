/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf } from '@kbn/config-schema';
import {
  type TinesConfigSchema,
  type TinesSecretsSchema,
  type TinesRunActionParamsSchema,
  type TinesRunActionResponseSchema,
  type TinesStoriesActionResponseSchema,
  type TinesWebhooksActionResponseSchema,
  type TinesWebhooksActionParamsSchema,
  type TinesWebhookObjectSchema,
  type TinesStoryObjectSchema,
} from './schema';

export type TinesConfig = TypeOf<typeof TinesConfigSchema>;
export type TinesSecrets = TypeOf<typeof TinesSecretsSchema>;
export type TinesRunActionParams = TypeOf<typeof TinesRunActionParamsSchema>;
export type TinesRunActionResponse = TypeOf<typeof TinesRunActionResponseSchema>;
export type TinesStoriesActionParams = void;
export type TinesStoryObject = TypeOf<typeof TinesStoryObjectSchema>;
export type TinesStoriesActionResponse = TypeOf<typeof TinesStoriesActionResponseSchema>;
export type TinesWebhooksActionParams = TypeOf<typeof TinesWebhooksActionParamsSchema>;
export type TinesWebhooksActionResponse = TypeOf<typeof TinesWebhooksActionResponseSchema>;
export type TinesWebhookObject = TypeOf<typeof TinesWebhookObjectSchema>;
