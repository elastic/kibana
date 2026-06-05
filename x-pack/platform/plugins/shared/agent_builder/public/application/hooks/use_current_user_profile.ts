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

export const useCurrentUserProfile = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.security.currentUserProfile,
    enabled: enabled && Boolean(services.userProfile),
    queryFn: async () => {
      if (!services.userProfile) {
        return null;
      }

      return services.userProfile.getCurrent<UserProfileWithAvatar['data']>({
        dataPath: AVATAR_DATA_PATH,
      }) as Promise<UserProfileWithAvatar | null>;
    },
  });
};
