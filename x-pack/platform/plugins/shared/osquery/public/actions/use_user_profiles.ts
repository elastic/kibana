/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useKibana } from '../common/lib/kibana';
import type { SearchHit } from '../../common/search_strategy';

export const useBulkGetUserProfiles = (actionItems: SearchHit[]) => {
  const { userProfile } = useKibana().services;

  const uidList = useMemo(() => {
    const uidSet = new Set<string>();

    for (const item of actionItems) {
      const uid = (item.fields?.user_profile_uid as string[] | undefined)?.[0];
      if (uid) {
        uidSet.add(uid);
      }
    }

    return Array.from(uidSet).sort();
  }, [actionItems]);

  const { data: userProfiles, isLoading } = useQuery<UserProfileWithAvatar[]>(
    ['useBulkGetUserProfiles', ...uidList],
    () => userProfile.bulkGet({ uids: new Set(uidList), dataPath: 'avatar' }),
    {
      enabled: uidList.length > 0,
      staleTime: Infinity,
      retry: false,
      keepPreviousData: true,
    }
  );

  const profilesMap = useMemo(() => {
    if (!userProfiles) return new Map<string, UserProfileWithAvatar>();

    return new Map(userProfiles.map((profile) => [profile.uid, profile]));
  }, [userProfiles]);

  return { profilesMap, isLoading: isLoading && uidList.length > 0 };
};
