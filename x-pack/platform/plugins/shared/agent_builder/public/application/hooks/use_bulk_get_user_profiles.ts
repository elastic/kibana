/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

const AVATAR_DATA_PATH = 'avatar';

export const useBulkGetUserProfiles = ({ uids }: { uids: string[] }) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.security.userProfiles(uids),
    enabled: uids.length > 0 && Boolean(services.userProfile),
    keepPreviousData: true,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!services.userProfile) {
        return new Map<string, UserProfileWithAvatar>();
      }

      const profiles = await services.userProfile.bulkGet<UserProfileWithAvatar['data']>({
        uids: new Set(uids),
        dataPath: AVATAR_DATA_PATH,
      });

      return profiles.reduce<Map<string, UserProfileWithAvatar>>((acc, profile) => {
        acc.set(profile.uid, profile as UserProfileWithAvatar);
        return acc;
      }, new Map<string, UserProfileWithAvatar>());
    },
  });
};
