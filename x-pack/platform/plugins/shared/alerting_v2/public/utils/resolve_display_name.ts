/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileMap } from '../hooks/use_bulk_get_user_profiles';

export const NO_USER_PLACEHOLDER = '-';

export const resolveDisplayName = (
  uid: string | null | undefined,
  profiles: UserProfileMap | undefined,
  placeholder: string = NO_USER_PLACEHOLDER
): string => {
  if (!uid) return placeholder;
  const profile = profiles?.get(uid);
  return profile?.user.full_name ?? profile?.user.username ?? uid;
};
