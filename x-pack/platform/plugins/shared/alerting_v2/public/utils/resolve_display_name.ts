/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Actor } from '@kbn/alerting-v2-schemas';
import type { UserProfileMap } from '../hooks/use_bulk_get_user_profiles';

export const NO_USER_PLACEHOLDER = '-';

/**
 * Resolves an actor to a human-readable name, falling back to the raw profile ID
 * when the profile could not be fetched (for example, a deleted user).
 */
export const resolveDisplayName = (
  actor: Actor | null | undefined,
  profiles: UserProfileMap | undefined,
  placeholder: string = NO_USER_PLACEHOLDER
): string => {
  const uid = actor?.profile_uid;
  if (!uid) return placeholder;
  const profile = profiles?.get(uid);
  return profile?.user.full_name ?? profile?.user.username ?? uid;
};

/** Collects the profile IDs to fetch from a set of actors, skipping unattributed ones. */
export const collectActorUids = (actors: Array<Actor | null | undefined>): string[] =>
  actors.map((actor) => actor?.profile_uid).filter((uid): uid is string => Boolean(uid));
