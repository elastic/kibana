/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { queryKeys } from '../query_keys';

export interface UseCurrentUserProfileOptions {
  userProfile: CoreStart['userProfile'];
}

/**
 * Fetches the current user's profile.
 *
 * The profile rarely changes within a session, so the result is cached
 * indefinitely (`staleTime: Infinity`). Returns `null` for anonymous users or
 * users authenticated via a proxy, who don't have a user profile.
 */
export const useCurrentUserProfile = ({ userProfile }: UseCurrentUserProfileOptions) =>
  useQuery({
    queryKey: queryKeys.currentUserProfile(),
    queryFn: () => userProfile.getCurrent(),
    staleTime: Infinity,
  });
