/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  AuthConfiguration,
  authTypeSchema,
  hasAuthSchema,
  SecretConfigurationSchema,
} from './schema';

export type HasAuth = TypeOf<typeof hasAuthSchema>;
export type AuthTypeName = TypeOf<typeof authTypeSchema>;
export type SecretsConfigurationType = TypeOf<typeof SecretConfigurationSchema>;
export type CAType = TypeOf<typeof AuthConfiguration.ca>;
export type VerificationModeType = TypeOf<typeof AuthConfiguration.verificationMode>;
