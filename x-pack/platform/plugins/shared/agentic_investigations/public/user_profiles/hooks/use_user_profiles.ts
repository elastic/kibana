/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UserProfileWithAvatar, UserProfileAvatarData } from '@kbn/user-profile-components';
import { userProfileQueryKeys } from '../query_keys';

const AVATAR_DATA_PATH = 'avatar';

/**
 * Fetches full user profiles (including avatar data) for a list of profile uids.
 * Deduplicates and sorts uids before the request so the cache key is stable regardless
 * of input order.
 */
export const useUserProfiles = ({
  uids,
  enabled = true,
}: {
  uids: readonly string[];
  enabled?: boolean;
}) => {
  const { services } = useKibana<CoreStart>();

  const dedupedUids = useMemo(() => Array.from(new Set(uids)).sort(), [uids]);

  return useQuery({
    queryKey: userProfileQueryKeys.bulk(dedupedUids),
    enabled: enabled && Boolean(services.userProfile) && dedupedUids.length > 0,
    queryFn: async (): Promise<UserProfileWithAvatar[]> => {
      return services.userProfile!.bulkGet<{ avatar?: UserProfileAvatarData }>({
        uids: new Set(dedupedUids),
        dataPath: AVATAR_DATA_PATH,
      });
    },
  });
};
