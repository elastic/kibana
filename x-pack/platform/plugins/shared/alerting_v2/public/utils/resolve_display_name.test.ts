/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile } from '@kbn/core-user-profile-common';
import type { UserProfileMap } from '../hooks/use_bulk_get_user_profiles';
import { collectActorUids, NO_USER_PLACEHOLDER, resolveDisplayName } from './resolve_display_name';

const ALICE_UID = 'u_alice_uid';
const ALICE_ACTOR = { profile_uid: ALICE_UID };

const makeProfile = (uid: string, user: UserProfile['user']): UserProfile => ({
  uid,
  enabled: true,
  user,
  data: {},
});

const profileMapWith = (...profiles: UserProfile[]): UserProfileMap => {
  const map: UserProfileMap = new Map();
  for (const profile of profiles) {
    map.set(profile.uid, profile);
  }
  return map;
};

describe('resolveDisplayName', () => {
  it('returns the full name when the profile has one', () => {
    const profiles = profileMapWith(
      makeProfile(ALICE_UID, { username: 'alice', full_name: 'Alice Example', email: 'a@b.c' })
    );

    expect(resolveDisplayName(ALICE_ACTOR, profiles)).toBe('Alice Example');
  });

  it('falls back to the username when the profile has no full name', () => {
    const profiles = profileMapWith(makeProfile(ALICE_UID, { username: 'alice', email: 'a@b.c' }));

    expect(resolveDisplayName(ALICE_ACTOR, profiles)).toBe('alice');
  });

  it('falls back to the UID when no profile matches', () => {
    const profiles = profileMapWith();

    expect(resolveDisplayName(ALICE_ACTOR, profiles)).toBe(ALICE_UID);
  });

  it('returns the default placeholder for an unattributed actor', () => {
    expect(resolveDisplayName(null, profileMapWith())).toBe(NO_USER_PLACEHOLDER);
  });

  it('returns the default placeholder when the actor is undefined', () => {
    expect(resolveDisplayName(undefined, profileMapWith())).toBe(NO_USER_PLACEHOLDER);
  });

  it('returns the default placeholder when the actor has an empty profile ID', () => {
    expect(resolveDisplayName({ profile_uid: '' }, profileMapWith())).toBe(NO_USER_PLACEHOLDER);
  });

  it('returns the default placeholder for a user whose profile could not be resolved', () => {
    expect(resolveDisplayName({ profile_uid: null }, profileMapWith())).toBe(NO_USER_PLACEHOLDER);
  });

  it('uses the caller-provided placeholder for an unattributed actor', () => {
    expect(resolveDisplayName(null, profileMapWith(), 'no user')).toBe('no user');
  });

  it('handles an undefined profiles map (loading state)', () => {
    expect(resolveDisplayName(ALICE_ACTOR, undefined)).toBe(ALICE_UID);
  });
});

describe('collectActorUids', () => {
  it('collects the profile IDs of attributed actors', () => {
    expect(collectActorUids([ALICE_ACTOR, { profile_uid: 'u_bob_uid' }])).toEqual([
      ALICE_UID,
      'u_bob_uid',
    ]);
  });

  it('skips actors with no user and users with no resolvable profile', () => {
    expect(collectActorUids([null, undefined, { profile_uid: null }, ALICE_ACTOR])).toEqual([
      ALICE_UID,
    ]);
  });
});
