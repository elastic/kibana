/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

export const useCurrentUserProfile = () => {
  const { services } = useKibana<CoreStart>();

  return useQuery<UserProfileWithAvatar | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      try {
        return await services.http.get<UserProfileWithAvatar>('/internal/security/user_profile', {
          query: { dataPath: 'avatar' },
        });
      } catch {
        // Anonymous users or proxy-auth users have no profile — treat as unavailable.
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
  });
};
