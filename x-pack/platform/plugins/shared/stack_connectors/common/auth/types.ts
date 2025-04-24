/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  AuthConfiguration,
  authTypeSchema,
  webhookAuthTypeSchema,
  hasAuthSchema,
  SecretConfigurationSchema,
  WebhookSecretConfigurationSchema,
} from './schema';

export type HasAuth = TypeOf<typeof hasAuthSchema>;
export type AuthTypeName = TypeOf<typeof authTypeSchema> | TypeOf<typeof webhookAuthTypeSchema>;
export type SecretsConfigurationType =
  | TypeOf<typeof SecretConfigurationSchema>
  | TypeOf<typeof WebhookSecretConfigurationSchema>;
export type CAType = TypeOf<typeof AuthConfiguration.ca>;
export type VerificationModeType = TypeOf<typeof AuthConfiguration.verificationMode>;
