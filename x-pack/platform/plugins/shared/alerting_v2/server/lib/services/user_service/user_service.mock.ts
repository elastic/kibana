/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithSecurity } from '@kbn/core-user-profile-common';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { UserService } from './user_service';

const mockProfile: UserProfileWithSecurity = {
  uid: 'elastic_profile_uid',
  enabled: true,
  user: {
    username: 'elastic',
    roles: [],
    realm_name: 'realm',
  },
  data: {},
  labels: {},
};

export function createUserService(): {
  userService: UserService;
  userProfile: jest.Mocked<UserProfileServiceStart>;
} {
  const request = httpServerMock.createKibanaRequest();
  const userProfile = userProfileServiceMock.createStart();

  userProfile.getCurrent.mockResolvedValue(createUserProfile());

  return {
    userService: new UserService(request, userProfile),
    userProfile,
  };
}

export function createUserProfile(uid?: string): UserProfileWithSecurity {
  return {
    ...mockProfile,
    ...(uid ? { uid } : {}),
  };
}
