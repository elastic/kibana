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
    const { userService, userProfile } = createUserService();

    await expect(userService.getCurrentUserProfileUid()).resolves.toBe('elastic_profile_uid');

    expect(userProfile.getCurrent).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('returns the current user info when user profile service is available', async () => {
    const { userService, userProfile } = createUserService();

    await expect(userService.getCurrentUserProfile()).resolves.toEqual({
      uid: 'elastic_profile_uid',
      username: 'elastic',
    });

    expect(userProfile.getCurrent).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('returns null when the profile is not found', async () => {
    const { userService, userProfile } = createUserService();
    userProfile.getCurrent.mockResolvedValue(null);

    await expect(userService.getCurrentUserProfileUid()).resolves.toBeNull();
  });

  it('returns null for profile uid when user profile service throws', async () => {
    const { userService, userProfile } = createUserService();
    userProfile.getCurrent.mockRejectedValue(new Error('not authenticated'));

    await expect(userService.getCurrentUserProfileUid()).resolves.toBeNull();
  });

  it('returns the username from the user profile', async () => {
    const { userService } = createUserService();

    await expect(userService.getCurrentUsername()).resolves.toBe('elastic');
  });

  it('falls back to security authc when user profile throws', async () => {
    const { userService, userProfile, security } = createUserService();
    userProfile.getCurrent.mockRejectedValue(new Error('not authenticated'));
    security.authc.getCurrentUser.mockReturnValue({
      username: 'agent-user',
      roles: [],
      enabled: true,
      authentication_realm: { name: 'api_key', type: 'api_key' },
      lookup_realm: { name: 'api_key', type: 'api_key' },
      authentication_provider: { name: 'api_key', type: 'api_key' },
      authentication_type: 'api_key',
      elastic_cloud_user: false,
    });

    await expect(userService.getCurrentUsername()).resolves.toBe('agent-user');
  });

  it('returns null when both user profile and security authc fail', async () => {
    const { userService, userProfile, security } = createUserService();
    userProfile.getCurrent.mockRejectedValue(new Error('not authenticated'));
    security.authc.getCurrentUser.mockReturnValue(null);

    await expect(userService.getCurrentUsername()).resolves.toBeNull();
  });

  it('returns null user info when the profile is not found', async () => {
    const { userService, userProfile } = createUserService();
    userProfile.getCurrent.mockResolvedValue(null);

    await expect(userService.getCurrentUserProfile()).resolves.toEqual({
      uid: null,
      username: null,
    });
  });
});
