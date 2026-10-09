/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { UserService } from './user_service';

const DEFAULT_PROFILE_UID = 'elastic_profile_uid';

export function createUserService(): {
  userService: UserService;
  userProfileService: jest.Mocked<UserProfileServiceStart>;
} {
  const request = httpServerMock.createKibanaRequest();
  const userProfileService = userProfileServiceMock.createStart();

  userProfileService.getCurrentProfileId.mockResolvedValue(DEFAULT_PROFILE_UID);

  return {
    userService: new UserService(request, userProfileService),
    userProfileService,
  };
}
