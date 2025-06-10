/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { isEmpty } from 'lodash';
import { INTERNAL_SUGGEST_USER_PROFILES_URL, DEFAULT_USER_SIZE } from '../../../common/constants';

export interface SuggestUserProfilesArgs {
  http: HttpStart;
  name: string;
  owners: string[];
  signal?: AbortSignal;
  size?: number;
}

export const suggestUserProfiles = async ({
  http,
  name,
  size = DEFAULT_USER_SIZE,
  owners,
  signal,
}: SuggestUserProfilesArgs): Promise<UserProfile[]> => {
  const response = await http.post<UserProfile[]>(INTERNAL_SUGGEST_USER_PROFILES_URL, {
    body: JSON.stringify({ name, size, owners }),
    signal,
  });

  return response;
};

export interface BulkGetUserProfilesArgs {
  userProfile: UserProfileService;
  uids: string[];
}

export const bulkGetUserProfiles = async ({
  userProfile,
  uids,
}: BulkGetUserProfilesArgs): Promise<UserProfile[]> => {
  const cleanUids: string[] = uids.filter((uid) => !isEmpty(uid));
  if (cleanUids.length === 0) {
    return [];
  }

  return userProfile.bulkGet({ uids: new Set(cleanUids), dataPath: 'avatar' });
};

export interface GetCurrentUserProfileArgs {
  userProfile: UserProfileService;
}

export const getCurrentUserProfile = async ({
  userProfile,
}: GetCurrentUserProfileArgs): Promise<UserProfile> => {
  return userProfile.getCurrent({ dataPath: 'avatar' });
};
