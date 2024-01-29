/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

export interface AuthenticationServiceSetup {
  /**
   * Returns currently authenticated user and throws if current user isn't authenticated.
   */
  getCurrentUser: () => Promise<AuthenticatedUser>;

  /**
   * Determines if API Keys are currently enabled.
   */
  areAPIKeysEnabled: () => Promise<boolean>;
}

/**
 * Start has the same contract as Setup for now.
 */
export type AuthenticationServiceStart = AuthenticationServiceSetup;
