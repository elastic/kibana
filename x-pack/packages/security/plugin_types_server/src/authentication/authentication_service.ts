/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { APIKeysService } from '@kbn/core-security-server';

/**
 * Authentication services available on the security plugin's start contract.
 */
export interface AuthenticationServiceStart {
  apiKeys: APIKeysService;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}
