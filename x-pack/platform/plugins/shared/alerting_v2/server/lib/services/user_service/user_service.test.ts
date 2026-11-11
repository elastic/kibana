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
import type { UserProfile } from '@kbn/core-user-profile-common';
import { createUserService } from './user_service.mock';
import { toSuggestUsersResponse } from './user_service';

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'uid-1',
  enabled: true,
  user: { username: 'alice', full_name: 'Alice Smith', email: 'alice@example.com' },
  data: {},
  ...overrides,
});

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

  it('suggests user profiles, forwarding params and returning the standardized response', async () => {
    const { userService, userProfileService } = createUserService();
    userProfileService.suggest.mockResolvedValue([
      profile({
        uid: 'uid-1',
        data: { avatar: { initials: 'AS', color: '#aabbcc', imageUrl: 'https://avatars/a.png' } },
      }),
    ]);

    const params = { name: 'ann', size: 5, dataPath: 'avatar' };
    await expect(userService.suggestUsers(params)).resolves.toEqual([
      {
        uid: 'uid-1',
        user: { username: 'alice', full_name: 'Alice Smith', email: 'alice@example.com' },
        avatar: { initials: 'AS', color: '#aabbcc', image_url: 'https://avatars/a.png' },
      },
    ]);
    expect(userProfileService.suggest).toHaveBeenCalledWith(params);
  });
});

describe('toSuggestUsersResponse', () => {
  it('maps the user fields and renames the avatar imageUrl to image_url', () => {
    const profiles: UserProfile[] = [
      profile({
        uid: 'uid-1',
        data: { avatar: { initials: 'AS', color: '#aabbcc', imageUrl: 'https://avatars/a.png' } },
      }),
    ];

    expect(toSuggestUsersResponse(profiles)).toEqual([
      {
        uid: 'uid-1',
        user: { username: 'alice', full_name: 'Alice Smith', email: 'alice@example.com' },
        avatar: { initials: 'AS', color: '#aabbcc', image_url: 'https://avatars/a.png' },
      },
    ]);
  });

  it('omits the avatar entirely when the profile has no avatar data', () => {
    const [mapped] = toSuggestUsersResponse([profile({ uid: 'uid-2', data: {} })]);

    expect(mapped).not.toHaveProperty('avatar');
    expect(mapped.user.username).toBe('alice');
  });

  it('passes through optional user fields as undefined when missing', () => {
    const [mapped] = toSuggestUsersResponse([profile({ user: { username: 'bob' }, data: {} })]);

    expect(mapped.user).toEqual({ username: 'bob', full_name: undefined, email: undefined });
  });

  it('returns an empty array for no profiles', () => {
    expect(toSuggestUsersResponse([])).toEqual([]);
  });
});
