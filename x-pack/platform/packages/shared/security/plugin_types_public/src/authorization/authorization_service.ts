/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegesAPIClientPublicContract } from '../privileges';
import type { RolesAPIClient } from '../roles';

export interface AuthorizationServiceSetup {
  /**
   * Determines if role management is enabled.
   */
  isRoleManagementEnabled: () => boolean | undefined;

  /**
   * A set of methods to work with Kibana user roles.
   */
  roles: RolesAPIClient;

  /**
   * A set of methods to work with Kibana role privileges
   */
  privileges: PrivilegesAPIClientPublicContract;
}

/**
 * Start has the same contract as Setup for now.
 */
export type AuthorizationServiceStart = AuthorizationServiceSetup;
