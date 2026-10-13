/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

/** Build a uid → profile lookup map from a flat list. */
export function indexProfiles(
  profiles: UserProfileWithAvatar[] | undefined
): Map<string, UserProfileWithAvatar> {
  const map = new Map<string, UserProfileWithAvatar>();
  for (const profile of profiles ?? []) {
    map.set(profile.uid, profile);
  }
  return map;
}

/**
 * Resolve each uid to a profile, falling back to a minimal placeholder for unknowns.
 * Placeholders survive the replace-in-full payload so unresolvable uids (e.g. deleted
 * users) can only be removed by an explicit deselect, not by a failed lookup.
 */
export function toSelectedProfiles(
  uids: readonly string[],
  profilesByUid: Map<string, UserProfileWithAvatar>
): UserProfileWithAvatar[] {
  return uids.map((uid) => {
    const resolved = profilesByUid.get(uid);
    if (resolved) return resolved;
    return {
      uid,
      enabled: true,
      user: { username: uid },
      data: {},
    } as UserProfileWithAvatar;
  });
}
