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
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { createUserService } from './user_service.mock';

describe('UserService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current user profile uid when user profile service is available', async () => {
    const { userService, userProfileService } = createUserService();

    await expect(userService.getCurrentUserProfileUid()).resolves.toBe('elastic_profile_uid');

    expect(userProfileService.getCurrentProfileId).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('returns null when the profile is not found', async () => {
    const { userService, userProfileService } = createUserService();
    userProfileService.getCurrentProfileId.mockResolvedValue(null);

    await expect(userService.getCurrentUserProfileUid()).resolves.toBeNull();
  });

  it('returns the current actor carrying the profile uid', async () => {
    const { userService } = createUserService();

    await expect(userService.getCurrentActor()).resolves.toEqual({
      profile_uid: 'elastic_profile_uid',
    });
  });

  it('returns an actor without a profile uid when the user has no resolvable profile', async () => {
    const { userService, userProfileService, securityService } = createUserService();
    userProfileService.getCurrentProfileId.mockResolvedValue(null);
    securityService.authc.getCurrentUser.mockReturnValue(
      securityServiceMock.createMockAuthenticatedUser()
    );

    await expect(userService.getCurrentActor()).resolves.toEqual({ profile_uid: null });
  });

  it('returns a null actor when there is no user behind the request', async () => {
    const { userService, userProfileService, securityService } = createUserService();
    userProfileService.getCurrentProfileId.mockResolvedValue(null);
    securityService.authc.getCurrentUser.mockReturnValue(null);

    await expect(userService.getCurrentActor()).resolves.toBeNull();
  });
});
