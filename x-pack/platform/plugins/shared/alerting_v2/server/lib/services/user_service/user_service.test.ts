/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUserService } from './user_service.mock';

describe('UserService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when request is authenticated (browser session)', () => {
    it('returns the current user profile uid', async () => {
      const { userService, userProfileService } = createUserService();

      await expect(userService.getCurrentUserProfileUid()).resolves.toBe('elastic_profile_uid');

      expect(userProfileService.getCurrent).toHaveBeenCalledWith({
        request: expect.anything(),
      });
    });

    it('returns the current user profile', async () => {
      const { userService, userProfileService } = createUserService();

      await expect(userService.getCurrentUserProfile()).resolves.toEqual({
        uid: 'elastic_profile_uid',
        username: 'elastic',
      });

      expect(userProfileService.getCurrent).toHaveBeenCalledWith({
        request: expect.anything(),
      });
    });

    it('returns the current username', async () => {
      const { userService } = createUserService();

      await expect(userService.getCurrentUsername()).resolves.toBe('elastic');
    });

    it('returns null uid when profile is not found', async () => {
      const { userService, userProfileService } = createUserService();
      userProfileService.getCurrent.mockResolvedValue(null);

      await expect(userService.getCurrentUserProfileUid()).resolves.toBeNull();
    });

    it('returns null user info when profile is not found', async () => {
      const { userService, userProfileService } = createUserService();
      userProfileService.getCurrent.mockResolvedValue(null);

      await expect(userService.getCurrentUserProfile()).resolves.toEqual({
        uid: null,
        username: null,
      });
    });
  });

  describe('when request is not authenticated (Task Manager fakeRequest)', () => {
    it('returns null uid without calling userProfile service', async () => {
      const { userService, userProfileService } = createUserService({ isAuthenticated: false });

      await expect(userService.getCurrentUserProfileUid()).resolves.toBeNull();

      expect(userProfileService.getCurrent).not.toHaveBeenCalled();
    });

    it('returns null user profile without calling userProfile service', async () => {
      const { userService, userProfileService } = createUserService({ isAuthenticated: false });

      await expect(userService.getCurrentUserProfile()).resolves.toEqual({
        uid: null,
        username: null,
      });

      expect(userProfileService.getCurrent).not.toHaveBeenCalled();
    });

    it('returns null username without calling userProfile service', async () => {
      const { userService, userProfileService } = createUserService({ isAuthenticated: false });

      await expect(userService.getCurrentUsername()).resolves.toBeNull();

      expect(userProfileService.getCurrent).not.toHaveBeenCalled();
    });
  });
});
