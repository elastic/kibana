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
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
  InvokeAIRawActionParamsSchema,
  InvokeAIRawActionResponseSchema,
  StreamingResponseSchema,
  RunApiLatestResponseSchema,
  BedrockMessageSchema,
  BedrockToolChoiceSchema,
  BedrockClientSendParamsSchema,
  ConverseActionParamsSchema,
  ConverseStreamActionParamsSchema,
} from './schema';

export type Config = z.input<typeof ConfigSchema>;
export type Secrets = z.infer<typeof SecretsSchema>;
export type RunActionParams = z.infer<typeof RunActionParamsSchema>;
export type InvokeAIActionParams = z.infer<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = z.infer<typeof InvokeAIActionResponseSchema>;
export type InvokeAIRawActionParams = z.infer<typeof InvokeAIRawActionParamsSchema>;
export type InvokeAIRawActionResponse = z.infer<typeof InvokeAIRawActionResponseSchema>;
export type RunApiLatestResponse = z.infer<typeof RunApiLatestResponseSchema>;
export type RunActionResponse = z.infer<typeof RunActionResponseSchema>;
export type StreamingResponse = z.infer<typeof StreamingResponseSchema>;
export type DashboardActionParams = z.infer<typeof DashboardActionParamsSchema>;
export type DashboardActionResponse = z.infer<typeof DashboardActionResponseSchema>;
export type BedrockMessage = z.infer<typeof BedrockMessageSchema>;
export type BedrockToolChoice = z.infer<typeof BedrockToolChoiceSchema>;
export type ConverseActionParams = z.infer<typeof BedrockClientSendParamsSchema>;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConverseActionResponse {}
// cannot directly infer type due to https://github.com/colinhacks/zod/issues/2938
// export type ConverseActionResponse = z.infer<typeof BedrockClientSendResponseSchema>;
// New types for Bedrock's converse and converse-stream APIs
export type ConverseParams = z.infer<typeof ConverseActionParamsSchema>;
export type ConverseStreamParams = z.infer<typeof ConverseStreamActionParamsSchema>;
