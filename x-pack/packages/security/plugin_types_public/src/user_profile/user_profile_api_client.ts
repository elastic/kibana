/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';

export type {
  GetUserProfileResponse,
  UserProfileSuggestParams,
  UserProfileBulkGetParams,
  UserProfileGetCurrentParams,
} from '@kbn/core-user-profile-browser';

export type UserProfileAPIClient = CoreUserProfileDelegateContract & {
  /**
   * Indicates if the user profile data has been loaded from the server.
   * Useful to distinguish between the case when the user profile data is `null` because the HTTP
   * request has not finished or because there is no user profile data for the current user.
   */
  readonly userProfileLoaded$: Observable<boolean>;
};
