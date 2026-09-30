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

const SUGGEST_PATH = '/internal/agent_builder/_suggest_user_profiles';
const DEFAULT_SIZE = 20;
const AVATAR_DATA_PATH = 'avatar';

export const useSuggestUsers = (
  searchTerm: string,
  { enabled = true }: { enabled?: boolean } = {}
) => {
  const { services } = useKibana();

  return useQuery<UserProfileWithAvatar[]>({
    queryKey: queryKeys.security.suggestUsers(searchTerm),
    enabled: enabled && Boolean(services.userProfile),
    keepPreviousData: true,
    queryFn: async () => {
      if (!services.userProfile) return [];
      const profiles = await services.userProfile.suggest<UserProfileWithAvatar['data']>(
        SUGGEST_PATH,
        {
          name: searchTerm,
          size: DEFAULT_SIZE,
          dataPath: AVATAR_DATA_PATH,
        }
      );
      return profiles;
    },
  });
};
