/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { UserService } from './user_service';
import { createUserProfile } from './user_service.mock';

describe('UserService', () => {
  const request = httpServerMock.createKibanaRequest();
  const userProfile = userProfileServiceMock.createStart();
  userProfile.getCurrent.mockResolvedValue(createUserProfile());

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current user profile uid when user profile service is available', async () => {
    const service = new UserService(request, userProfile);

    await expect(service.getCurrentUserProfileUid()).resolves.toBe('elastic_profile_uid');
  });

  it('returns null when UserService is not available', async () => {
    const service = new UserService(request, undefined);

    await expect(service.getCurrentUserProfileUid()).resolves.toBeNull();
  });

  it('returns null when the profile of current user is not available', async () => {
    userProfile.getCurrent.mockResolvedValue(null);

    const service = new UserService(request, userProfile);

    await expect(service.getCurrentUserProfileUid()).resolves.toBeNull();
  });
});
