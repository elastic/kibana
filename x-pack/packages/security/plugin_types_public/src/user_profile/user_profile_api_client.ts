/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UserProfileData,
  AuthenticatedUser,
  UserProfileWithSecurity,
  UserProfile,
} from '@kbn/security-plugin-types-common';
import type { Observable } from 'rxjs';

export interface UserProfileAPIClient {
  readonly userProfile$: Observable<UserProfileData | null>;
  /**
   * Indicates if the user profile data has been loaded from the server.
   * Useful to distinguish between the case when the user profile data is `null` because the HTTP
   * request has not finished or because there is no user profile data for the current user.
   */
  readonly userProfileLoaded$: Observable<boolean>;
  /** Flag to indicate if the current user has a user profile. Anonymous users don't have user profiles. */
  readonly enabled$: Observable<boolean>;
  /**
   * Retrieves the user profile of the current user. If the profile isn't available, e.g. for the anonymous users or
   * users authenticated via authenticating proxies, the `null` value is returned.
   * @param [params] Get current user profile operation parameters.
   * @param params.dataPath By default `getCurrent()` returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for this user.
   */
  getCurrent<D extends UserProfileData>(
    params?: UserProfileGetCurrentParams
  ): Promise<GetUserProfileResponse<D>>;

  /**
   * Retrieves multiple user profiles by their identifiers.
   * @param params Bulk get operation parameters.
   * @param params.uids List of user profile identifiers.
   * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
   * optional "dataPath" parameter can be used to return personal data for the requested user profiles.
   */
  bulkGet<D extends UserProfileData>(
    params: UserProfileBulkGetParams
  ): Promise<Array<UserProfile<D>>>;

  /**
   * Suggests multiple user profiles by search criteria.
   *
   * Note: This endpoint is not provided out-of-the-box by the platform. You need to expose your own
   * version within your app. An example of how to do this can be found in:
   * `examples/user_profile_examples/server/plugin.ts`
   *
   * @param path Path to your app's suggest endpoint.
   * @param params Suggest operation parameters.
   * @param params.name Query string used to match name-related fields in user profiles. The
   * following fields are treated as name-related: username, full_name and email.
   * @param params.size Desired number of suggestions to return. The default value is 10.
   * @param params.dataPath By default, suggest API returns user information, but does not return
   * any user data. The optional "dataPath" parameter can be used to return personal data for this
   * user (within `kibana` namespace only).
   */
  suggest<D extends UserProfileData>(
    path: string,
    params: UserProfileSuggestParams
  ): Promise<Array<UserProfile<D>>>;

  /**
   * Updates user profile data of the current user.
   * @param data Application data to be written (merged with existing data).
   */
  update<D extends UserProfileData>(data: D): Promise<void>;

  /**
   * Partially updates user profile data of the current user, merging the previous data with the provided data.
   * @param data Application data to be merged with existing data.
   */
  partialUpdate<D extends Partial<UserProfileData>>(data: D): Promise<void>;
}

/**
 * Parameters for the get user profile for the current user API.
 */
export interface UserProfileGetCurrentParams {
  /**
   * By default, get API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath: string;
}

export interface GetUserProfileResponse<D extends UserProfileData = UserProfileData>
  extends UserProfileWithSecurity<D> {
  /**
   * Information about the currently authenticated user that owns the profile.
   */
  user: UserProfileWithSecurity['user'] & Pick<AuthenticatedUser, 'authentication_provider'>;
}

/**
 * Parameters for the bulk get API.
 */
export interface UserProfileBulkGetParams {
  /**
   * List of user profile identifiers.
   */
  uids: Set<string>;

  /**
   * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath?: string;
}

/**
 * Parameters for the suggest API.
 */
export interface UserProfileSuggestParams {
  /**
   * Query string used to match name-related fields in user profiles. The following fields are treated as
   * name-related: username, full_name and email.
   */
  name: string;

  /**
   * Desired number of suggestions to return. The default value is 10.
   */
  size?: number;

  /**
   * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
   * parameter can be used to return personal data for this user (within `kibana` namespace only).
   */
  dataPath?: string;
}
