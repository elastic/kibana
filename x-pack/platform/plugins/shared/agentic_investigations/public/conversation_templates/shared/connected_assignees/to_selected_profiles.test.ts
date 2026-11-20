/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { indexProfiles, toSelectedProfiles } from './to_selected_profiles';

const profile = (uid: string): UserProfileWithAvatar => ({
  uid,
  enabled: true,
  user: { username: uid },
  data: { avatar: { imageUrl: `https://example.com/${uid}.jpg` } },
});

describe('indexProfiles', () => {
  it('returns an empty map for undefined input', () => {
    expect(indexProfiles(undefined).size).toBe(0);
  });

  it('indexes profiles by uid', () => {
    const map = indexProfiles([profile('alice'), profile('bob')]);
    expect(map.get('alice')?.user.username).toBe('alice');
    expect(map.get('bob')?.user.username).toBe('bob');
  });
});

describe('toSelectedProfiles', () => {
  it('resolves uids that exist in the map', () => {
    const map = new Map([['alice', profile('alice')]]);
    const result = toSelectedProfiles(['alice'], map);
    expect(result[0]).toBe(map.get('alice'));
  });

  it('synthesises a placeholder for unresolvable uids', () => {
    const result = toSelectedProfiles(['ghost'], new Map());
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe('ghost');
    expect(result[0].user.username).toBe('ghost');
  });

  it('preserves ordering and mixes resolved and placeholder profiles', () => {
    const map = new Map([['alice', profile('alice')]]);
    const result = toSelectedProfiles(['alice', 'ghost'], map);
    expect(result[0]).toBe(map.get('alice'));
    expect(result[1].uid).toBe('ghost');
  });

  it('returns an empty array for empty uids', () => {
    expect(toSelectedProfiles([], new Map())).toEqual([]);
  });
});
