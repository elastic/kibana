/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';

export function getAuthenticatedUser(
  request: KibanaRequest,
  security?: SecurityServiceStart
): AuthenticatedUser {
  if (!security) {
    throw new Error('Security service not initialized');
  }
  try {
    const user = security.authc.getCurrentUser(request);
    if (!user) {
      throw new Error('Current authenticated user not found');
    }
    return user;
  } catch (error) {
    throw new Error(`Failed to get authenticated user: ${error.message}`);
  }
}
