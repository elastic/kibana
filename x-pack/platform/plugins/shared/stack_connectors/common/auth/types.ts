/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  AuthConfiguration,
  authTypeSchema,
  hasAuthSchema,
  SecretConfigurationSchema,
} from './schema';

export type HasAuth = z.infer<typeof hasAuthSchema>;
export type AuthTypeName = z.infer<typeof authTypeSchema>;
export type SecretsConfigurationType = z.infer<typeof SecretConfigurationSchema>;
export type CAType = z.infer<typeof AuthConfiguration.ca>;
export type VerificationModeType = z.infer<typeof AuthConfiguration.verificationMode>;
