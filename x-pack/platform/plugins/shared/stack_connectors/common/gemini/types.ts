/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  ConfigSchema,
  DashboardActionParamsSchema,
  DashboardActionResponseSchema,
  SecretsSchema,
  RunActionParamsSchema,
  RunActionResponseSchema,
  RunActionRawResponseSchema,
  RunApiResponseSchema,
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
  InvokeAIRawActionParamsSchema,
  InvokeAIRawActionResponseSchema,
  StreamingResponseSchema,
} from './schema';

export type Config = z.input<typeof ConfigSchema>;
export type Secrets = z.infer<typeof SecretsSchema>;
export type RunActionParams = z.infer<typeof RunActionParamsSchema>;
export type RunApiResponse = z.infer<typeof RunApiResponseSchema>;
export type RunActionResponse = z.infer<typeof RunActionResponseSchema>;
export type RunActionRawResponse = z.infer<typeof RunActionRawResponseSchema>;
export type DashboardActionParams = z.infer<typeof DashboardActionParamsSchema>;
export type DashboardActionResponse = z.infer<typeof DashboardActionResponseSchema>;
export type InvokeAIActionParams = z.infer<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = z.infer<typeof InvokeAIActionResponseSchema>;
export type InvokeAIRawActionParams = z.infer<typeof InvokeAIRawActionParamsSchema>;
export type InvokeAIRawActionResponse = z.infer<typeof InvokeAIRawActionResponseSchema>;
export type StreamingResponse = z.infer<typeof StreamingResponseSchema>;
