/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  ConfigSchema,
  DashboardActionParamsSchema,
  DashboardActionResponseSchema,
  SecretsSchema,
  RunActionParamsSchema,
  RunActionResponseSchema,
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
  InvokeAIRawActionParamsSchema,
  InvokeAIRawActionResponseSchema,
  StreamingResponseSchema,
  RunApiLatestResponseSchema,
  BedrockMessageSchema,
  BedrockToolChoiceSchema,
  BedrockClientSendParamsSchema,
  BedrockClientSendResponseSchema,
} from './schema';

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;
export type RunActionParams = TypeOf<typeof RunActionParamsSchema>;
export type InvokeAIActionParams = TypeOf<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = TypeOf<typeof InvokeAIActionResponseSchema>;
export type InvokeAIRawActionParams = TypeOf<typeof InvokeAIRawActionParamsSchema>;
export type InvokeAIRawActionResponse = TypeOf<typeof InvokeAIRawActionResponseSchema>;
export type RunApiLatestResponse = TypeOf<typeof RunApiLatestResponseSchema>;
export type RunActionResponse = TypeOf<typeof RunActionResponseSchema>;
export type StreamingResponse = TypeOf<typeof StreamingResponseSchema>;
export type DashboardActionParams = TypeOf<typeof DashboardActionParamsSchema>;
export type DashboardActionResponse = TypeOf<typeof DashboardActionResponseSchema>;
export type BedrockMessage = TypeOf<typeof BedrockMessageSchema>;
export type BedrockToolChoice = TypeOf<typeof BedrockToolChoiceSchema>;
export type ConverseActionParams = TypeOf<typeof BedrockClientSendParamsSchema>;
export type ConverseActionResponse = TypeOf<typeof BedrockClientSendResponseSchema>;
