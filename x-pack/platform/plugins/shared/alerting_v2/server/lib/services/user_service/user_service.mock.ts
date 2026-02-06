/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithSecurity } from '@kbn/core-user-profile-common';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { UserService } from './user_service';

interface CreateUserServiceOptions {
  request?: KibanaRequest;
  uid?: string | null;
}

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

export function createUserService(options: CreateUserServiceOptions = {}): UserService {
  const request = options.request ?? httpServerMock.createKibanaRequest();
  const userProfile = userProfileServiceMock.createStart();

  if (options.uid !== undefined) {
    userProfile.getCurrent.mockResolvedValue(createUserProfile(options.uid!));
  } else {
    userProfile.getCurrent.mockResolvedValue(createUserProfile());
  }

  return new UserService(request, userProfile);
}

export function createUserProfile(uid?: string): UserProfileWithSecurity {
  return {
    ...mockProfile,
    ...(uid ? { uid } : {}),
  };
}
