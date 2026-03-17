/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useKibana } from './lib/kibana';

/**
 * Generic hook to bulk-fetch user profiles by UIDs.
 * Unlike the history-specific version in actions/use_user_profiles.ts,
 * this accepts raw UID strings and can be used with any data source
 * (packs, saved queries, etc.).
 */
export const useGenericBulkGetUserProfiles = (uids: string[]) => {
  const { userProfile } = useKibana().services;

  const sortedUids = useMemo(() => [...new Set(uids)].sort(), [uids]);

  const { data: userProfiles, isLoading } = useQuery<UserProfileWithAvatar[]>(
    ['useGenericBulkGetUserProfiles', ...sortedUids],
    () => userProfile.bulkGet({ uids: new Set(sortedUids), dataPath: 'avatar' }),
    {
      enabled: sortedUids.length > 0,
      staleTime: Infinity,
      retry: false,
      keepPreviousData: true,
    }
  );

  const profilesMap = useMemo(() => {
    if (!userProfiles) return new Map<string, UserProfileWithAvatar>();

    return new Map(userProfiles.map((profile) => [profile.uid, profile]));
  }, [userProfiles]);

  return { profilesMap, isLoading: isLoading && sortedUids.length > 0 };
};
