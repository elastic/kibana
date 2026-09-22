/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { UserProfileAvatarData, UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

export const useUserProfiles = ({
  uids,
  enabled = true,
}: {
  uids: string[];
  enabled?: boolean;
}) => {
  const {
    services: { userProfile },
  } = useKibana();

  const dedupedUids = useMemo(() => Array.from(new Set(uids)).sort(), [uids]);

  return useQuery({
    queryKey: queryKeys.security.userProfiles(dedupedUids),
    enabled: enabled && Boolean(userProfile) && dedupedUids.length > 0,
    queryFn: async (): Promise<UserProfileWithAvatar[]> => {
      return await userProfile.bulkGet<{ avatar?: UserProfileAvatarData }>({
        uids: new Set(dedupedUids),
        dataPath: 'avatar',
      });
    },
  });
};
