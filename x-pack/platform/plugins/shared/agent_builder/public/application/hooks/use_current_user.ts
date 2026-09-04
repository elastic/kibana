/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UserProfileAvatarData, UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

/**
 * Fetches the current user from Kibana's User Profile service.
 */
export const useCurrentUser = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { services } = useKibana();

  const { data, isLoading } = useQuery<UserProfileWithAvatar | null>({
    queryKey: queryKeys.security.currentUser,
    queryFn: async () =>
      services.userProfile.getCurrent<{ avatar?: UserProfileAvatarData }>({ dataPath: 'avatar' }),
    enabled,
  });

  return { currentUser: data ?? null, isLoading };
};
