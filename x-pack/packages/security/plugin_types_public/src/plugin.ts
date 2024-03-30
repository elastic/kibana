/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityLicense } from '@kbn/security-plugin-types-common';
import type { AuthenticationServiceSetup, AuthenticationServiceStart } from './authentication';
import type { AuthorizationServiceSetup, AuthorizationServiceStart } from './authorization';
import type { SecurityNavControlServiceStart } from './nav_control';
import type { UserProfileAPIClient } from './user_profile';

export interface SecurityPluginSetup {
  /**
   * Exposes authentication information about the currently logged in user.
   */
  authc: AuthenticationServiceSetup;
  /**
   * Exposes authorization configuration.
   */
  authz: AuthorizationServiceSetup;
  /**
   * Exposes information about the available security features under the current license.
   */
  license: SecurityLicense;
}

export interface SecurityPluginStart {
  /**
   * Exposes the ability to add custom links to the dropdown menu in the top right, where the user's Avatar is.
   */
  navControlService: SecurityNavControlServiceStart;
  /**
   * Exposes authentication information about the currently logged in user.
   */
  authc: AuthenticationServiceStart;
  /**
   * Exposes authorization configuration.
   */
  authz: AuthorizationServiceStart;
  /**
   * A set of methods to work with Kibana user profiles.
   */
  userProfiles: UserProfileAPIClient;
}
