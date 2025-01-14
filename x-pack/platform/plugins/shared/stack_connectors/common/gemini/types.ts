/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf } from '@kbn/config-schema';
import {
  type ConfigSchema,
  type DashboardActionParamsSchema,
  type DashboardActionResponseSchema,
  type SecretsSchema,
  type RunActionParamsSchema,
  type RunActionResponseSchema,
  type RunActionRawResponseSchema,
  type RunApiResponseSchema,
  type InvokeAIActionParamsSchema,
  type InvokeAIActionResponseSchema,
  type InvokeAIRawActionParamsSchema,
  type InvokeAIRawActionResponseSchema,
  type StreamingResponseSchema,
} from './schema';

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;
export type RunActionParams = TypeOf<typeof RunActionParamsSchema>;
export type RunApiResponse = TypeOf<typeof RunApiResponseSchema>;
export type RunActionResponse = TypeOf<typeof RunActionResponseSchema>;
export type RunActionRawResponse = TypeOf<typeof RunActionRawResponseSchema>;
export type DashboardActionParams = TypeOf<typeof DashboardActionParamsSchema>;
export type DashboardActionResponse = TypeOf<typeof DashboardActionResponseSchema>;
export type InvokeAIActionParams = TypeOf<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = TypeOf<typeof InvokeAIActionResponseSchema>;
export type InvokeAIRawActionParams = TypeOf<typeof InvokeAIRawActionParamsSchema>;
export type InvokeAIRawActionResponse = TypeOf<typeof InvokeAIRawActionResponseSchema>;
export type StreamingResponse = TypeOf<typeof StreamingResponseSchema>;
