/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useKibana } from '../common/lib/kibana';

const BULK_GET_USER_PROFILES_URL = '/internal/security/user_profile/_bulk_get';

export type UserProfilesMap = Map<string, UserProfileWithAvatar>;

export const useBulkGetUserProfiles = (uids: string[]) => {
  const { http } = useKibana().services;
  const uniqueUids = [...new Set(uids.filter(Boolean))];

  return useQuery(
    ['bulkGetUserProfiles', uniqueUids],
    async (): Promise<UserProfilesMap> => {
      if (uniqueUids.length === 0) {
        return new Map();
      }

      const profiles = await http.post<UserProfileWithAvatar[]>(BULK_GET_USER_PROFILES_URL, {
        body: JSON.stringify({ uids: uniqueUids, dataPath: 'avatar' }),
        version: '1',
      });

      const profilesMap: UserProfilesMap = new Map();

      for (const profile of profiles) {
        profilesMap.set(profile.uid, profile);
      }

      return profilesMap;
    },
    {
      enabled: uniqueUids.length > 0,
      keepPreviousData: true,
      staleTime: 60000,
    }
  );
};
