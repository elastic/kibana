/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  UserProfileData,
  UserProfileWithSecurity,
} from '@kbn/security-plugin-types-common';

/**
 * User profile enriched with session information.
 */
export interface GetUserProfileResponse<D extends UserProfileData = UserProfileData>
  extends UserProfileWithSecurity<D> {
  /**
   * Information about the currently authenticated user that owns the profile.
   */
  user: UserProfileWithSecurity['user'] & Pick<AuthenticatedUser, 'authentication_provider'>;
}
