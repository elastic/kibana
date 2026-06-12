/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { API_VERSIONS } from '../../common/constants';
import { useKibana } from './lib/kibana';
import { PACK_USERS_ID } from '../packs/constants';
import { SAVED_QUERY_USERS_ID } from '../saved_queries/constants';

interface UserEntry {
  created_by: string;
  created_by_profile_uid?: string;
}

interface UsersResponse {
  data: UserEntry[];
}

const useSavedObjectUsers = (endpoint: string, queryKey: string) => {
  const { http, userProfile } = useKibana().services;

  const { data: usersData, isLoading: isLoadingUsers } = useQuery<UsersResponse>(
    [queryKey],
    () => http.get<UsersResponse>(endpoint, { version: API_VERSIONS.internal.v1 }),
    {
      keepPreviousData: true,
      staleTime: 30_000,
      retry: false,
    }
  );

  const users = useMemo(() => usersData?.data.map((c) => c.created_by) ?? [], [usersData]);

  const profileUids = useMemo(
    () =>
      usersData?.data
        .map((c) => c.created_by_profile_uid)
        .filter((uid): uid is string => uid != null) ?? [],
    [usersData]
  );

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<UserProfileWithAvatar[]>(
    [`${queryKey}Profiles`, ...profileUids],
    () => userProfile.bulkGet({ uids: new Set(profileUids), dataPath: 'avatar' }),
    {
      enabled: profileUids.length > 0,
      staleTime: Infinity,
      retry: false,
    }
  );

  const profilesMap = useMemo(() => {
    if (!profiles) return new Map<string, UserProfileWithAvatar>();

    return new Map(profiles.map((p) => [p.uid, p]));
  }, [profiles]);

  return {
    users,
    profilesMap,
    isLoading: isLoadingUsers || (profileUids.length > 0 && isLoadingProfiles),
  };
};

export const usePackUsers = () =>
  useSavedObjectUsers('/internal/osquery/packs/users', PACK_USERS_ID);

export const useSavedQueryUsers = () =>
  useSavedObjectUsers('/internal/osquery/saved_queries/users', SAVED_QUERY_USERS_ID);
