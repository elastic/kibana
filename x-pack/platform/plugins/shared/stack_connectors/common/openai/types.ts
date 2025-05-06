/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  ConfigSchema,
  SecretsSchema,
  RunActionParamsSchema,
  RunActionResponseSchema,
  DashboardActionParamsSchema,
  DashboardActionResponseSchema,
  StreamActionParamsSchema,
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
} from './schema';

// PKI configuration interface for OpenAiProviderType.Other
export interface PKIConfig {
  certificateFile?: string | string[];
  certificateData?: string;
  privateKeyFile?: string | string[];
  privateKeyData?: string;
  verificationMode?: 'full' | 'certificate' | 'none';
}

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;
export type RunActionParams = TypeOf<typeof RunActionParamsSchema>;
export type RunActionResponse = TypeOf<typeof RunActionResponseSchema>;
export type DashboardActionParams = TypeOf<typeof DashboardActionParamsSchema>;
export type DashboardActionResponse = TypeOf<typeof DashboardActionResponseSchema>;
export type StreamActionParams = TypeOf<typeof StreamActionParamsSchema>;
export type InvokeAIActionParams = TypeOf<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = TypeOf<typeof InvokeAIActionResponseSchema>;
