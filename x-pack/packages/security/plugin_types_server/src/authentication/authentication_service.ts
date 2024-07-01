/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';

import type { APIKeys } from './api_keys';

/**
 * Authentication services available on the security plugin's start contract.
 */
export interface AuthenticationServiceStart {
  apiKeys: APIKeys;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}
