/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { UserProfileWithAvatar, UserProfileAvatarData } from '@kbn/user-profile-components';
import {
  AGENT_BUILDER_SUGGEST_USER_PROFILES_PATH,
  SUGGEST_USER_PROFILES_SIZE,
  USER_PROFILE_AVATAR_DATA_PATH,
} from '../constants';
import { escalationQueryKeys } from '../query_keys';

/**
 * Fetches full user profiles (including avatar data) for a list of user profile uids.
 * Used to render assignee avatars in the escalation queue.
 *
 * Modelled on `agent_builder/public/application/hooks/use_user_profiles.ts`.
 */
export const useEscalationUserProfiles = ({
  uids,
  enabled = true,
}: {
  uids: readonly string[];
  enabled?: boolean;
}) => {
  const { services } = useKibana();

  const dedupedUids = useMemo(() => Array.from(new Set(uids)).sort(), [uids]);

  return useQuery({
    queryKey: escalationQueryKeys.userProfiles(dedupedUids),
    enabled: enabled && Boolean(services.userProfile) && dedupedUids.length > 0,
    queryFn: async (): Promise<UserProfileWithAvatar[]> => {
      return await services.userProfile!.bulkGet<{ avatar?: UserProfileAvatarData }>({
        uids: new Set(dedupedUids),
        dataPath: USER_PROFILE_AVATAR_DATA_PATH,
      });
    },
  });
};

/**
 * Suggests user profiles matching a search term. Used by the assignee picker popover.
 *
 * Uses the Agent Builder suggest route, which is already privilege-scoped to users
 * who can access the current space.
 *
 * Modelled on `agent_builder/public/application/hooks/use_suggest_users.ts`.
 */
export const useSuggestEscalationAssignees = (
  searchTerm: string,
  { enabled = true }: { enabled?: boolean } = {}
) => {
  const { services } = useKibana();

  return useQuery<UserProfileWithAvatar[]>({
    queryKey: escalationQueryKeys.suggestUsers(searchTerm),
    enabled: enabled && Boolean(services.userProfile),
    keepPreviousData: true,
    queryFn: async (): Promise<UserProfileWithAvatar[]> => {
      if (!services.userProfile) return [];
      return services.userProfile.suggest<UserProfileWithAvatar['data']>(
        AGENT_BUILDER_SUGGEST_USER_PROFILES_PATH,
        {
          name: searchTerm,
          size: SUGGEST_USER_PROFILES_SIZE,
          dataPath: USER_PROFILE_AVATAR_DATA_PATH,
        }
      );
    },
  });
};
