/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The route handler is covered end-to-end by the Scout API spec
// (test/scout/alerts/api/tests/user_profiles_suggestions.spec.ts). Only the
// pure response mapper is unit tested here, because the avatar `imageUrl` ->
// `image_url` rename and the conditional avatar shape are awkward to seed
// deterministically through a running stack.
import type { UserProfile } from '@kbn/core-user-profile-common';
import { toSuggestUserProfilesResponse } from './suggest_user_profiles_route';

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'uid-1',
  enabled: true,
  user: { username: 'alice', full_name: 'Alice Smith', email: 'alice@example.com' },
  data: {},
  ...overrides,
});

describe('toSuggestUserProfilesResponse', () => {
  it('maps the user fields and renames the avatar imageUrl to image_url', () => {
    const profiles: UserProfile[] = [
      profile({
        uid: 'uid-1',
        data: { avatar: { initials: 'AS', color: '#aabbcc', imageUrl: 'https://avatars/a.png' } },
      }),
    ];

    expect(toSuggestUserProfilesResponse(profiles)).toEqual([
      {
        uid: 'uid-1',
        user: { username: 'alice', full_name: 'Alice Smith', email: 'alice@example.com' },
        avatar: { initials: 'AS', color: '#aabbcc', image_url: 'https://avatars/a.png' },
      },
    ]);
  });

  it('omits the avatar entirely when the profile has no avatar data', () => {
    const [mapped] = toSuggestUserProfilesResponse([profile({ uid: 'uid-2', data: {} })]);

    expect(mapped).not.toHaveProperty('avatar');
    expect(mapped.user.username).toBe('alice');
  });

  it('passes through optional user fields as undefined when missing', () => {
    const [mapped] = toSuggestUserProfilesResponse([
      profile({ user: { username: 'bob' }, data: {} }),
    ]);

    expect(mapped.user).toEqual({ username: 'bob', full_name: undefined, email: undefined });
  });

  it('returns an empty array for no profiles', () => {
    expect(toSuggestUserProfilesResponse([])).toEqual([]);
  });
});
