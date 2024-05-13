/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AuthorizationServiceSetup {
  /**
   * Determines if role management is enabled.
   */
  isRoleManagementEnabled: () => boolean | undefined;

  /**
   * Retrieve current user's API key privileges.
   */
  getCurrentUserApiKeyPrivileges: () => Promise<AuthorizationCurrentUserApiKeyPrivilegesResponse>;
}

export interface AuthorizationCurrentUserApiKeyPrivilegesResponse {
  canManageApiKeys: boolean;
  canManageCrossClusterApiKeys: boolean;
  canManageOwnApiKeys: boolean;
}

/**
 * Start has the same contract as Setup for now.
 */
export type AuthorizationServiceStart = AuthorizationServiceSetup;
