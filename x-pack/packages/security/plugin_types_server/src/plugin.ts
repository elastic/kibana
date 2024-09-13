/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityLicense } from '@kbn/security-plugin-types-common';
import type { AuditServiceSetup } from './audit';
import type { PrivilegeDeprecationsService, AuthorizationServiceSetup } from './authorization';
import type { AuthenticationServiceStart } from './authentication';
import type { UserProfileServiceStart } from './user_profile';

/**
 * Describes public Security plugin contract returned at the `setup` stage.
 */
export interface SecurityPluginSetup {
  /**
   * Exposes information about the available security features under the current license.
   */
  license: SecurityLicense;
  /**
   * Exposes services for audit logging.
   *
   * @deprecated in favor of Core's `security` service
   */
  audit: AuditServiceSetup;
  /**
   * Exposes services to access kibana roles per feature id with the GetDeprecationsContext
   */
  privilegeDeprecationsService: PrivilegeDeprecationsService;
}

/**
 * Describes public Security plugin contract returned at the `start` stage.
 */
export interface SecurityPluginStart {
  /**
   * Authentication services to confirm the user is who they say they are.
   *
   * @deprecated in favor of Core's `security` service
   */
  authc: AuthenticationServiceStart;
  /**
   * Authorization services to manage and access the permissions a particular user has.
   */
  authz: AuthorizationServiceSetup;
  /**
   * User profiles services to retrieve user profiles.
   *
   * @deprecated in favor of Core's `userProfile` service
   */
  userProfiles: UserProfileServiceStart;
}
