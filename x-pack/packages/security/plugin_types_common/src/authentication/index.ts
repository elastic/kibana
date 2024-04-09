/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// re-exporting from core package to avoid changing all imports
export type {
  User,
  UserRealm,
  AuthenticatedUser,
  AuthenticationProvider,
} from '@kbn/core-security-common';
