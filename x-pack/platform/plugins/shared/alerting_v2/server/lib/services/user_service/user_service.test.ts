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
import { createUserService } from './user_service.mock';

describe('UserService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current user profile uid when user profile service is available', async () => {
    const { userService, userProfileService } = createUserService();

    await expect(userService.getCurrentUserProfileUid()).resolves.toBe('elastic_profile_uid');

    expect(userProfileService.getCurrent).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('returns the current user info when user profile service is available', async () => {
    const { userService, userProfileService } = createUserService();

    await expect(userService.getCurrentUserProfile()).resolves.toEqual({
      uid: 'elastic_profile_uid',
      username: 'elastic',
    });

    expect(userProfileService.getCurrent).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('returns null when the profile is not found', async () => {
    const { userService, userProfileService } = createUserService();
    userProfileService.getCurrent.mockResolvedValue(null);

    await expect(userService.getCurrentUserProfileUid()).resolves.toBeNull();
  });

  it('returns null user info when the profile is not found', async () => {
    const { userService, userProfileService } = createUserService();
    userProfileService.getCurrent.mockResolvedValue(null);

    await expect(userService.getCurrentUserProfile()).resolves.toEqual({
      uid: null,
      username: null,
    });
  });
});
