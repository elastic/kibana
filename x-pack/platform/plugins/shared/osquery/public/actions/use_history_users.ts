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
import { useKibana } from '../common/lib/kibana';

interface HistoryUser {
  user_id: string;
  user_profile_uid?: string;
}

interface HistoryUsersResponse {
  data: HistoryUser[];
}

export interface HistoryUserOption {
  userId: string;
  profile?: UserProfileWithAvatar;
  displayName: string;
}

const HISTORY_USERS_QUERY_KEY = 'historyUsers';

export const useHistoryUsers = ({
  enabled = true,
  searchTerm = '',
}: { enabled?: boolean; searchTerm?: string } = {}) => {
  const { http, userProfile } = useKibana().services;

  const { data: usersData, isLoading: isLoadingUsers } = useQuery<HistoryUsersResponse>(
    [HISTORY_USERS_QUERY_KEY, searchTerm],
    () =>
      http.get<HistoryUsersResponse>('/internal/osquery/history/users', {
        version: API_VERSIONS.internal.v1,
        query: { ...(searchTerm ? { searchTerm } : {}) },
      }),
    {
      enabled,
      keepPreviousData: true,
      staleTime: 30_000,
      retry: false,
    }
  );

  const profileUids = useMemo(() => {
    if (!usersData?.data) return [];

    return usersData.data
      .map((u) => u.user_profile_uid)
      .filter((uid): uid is string => uid != null);
  }, [usersData]);

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<UserProfileWithAvatar[]>(
    ['historyUserProfiles', ...profileUids],
    () => userProfile.bulkGet({ uids: new Set(profileUids), dataPath: 'avatar' }),
    {
      enabled: enabled && profileUids.length > 0,
      staleTime: Infinity,
      retry: false,
    }
  );

  const userOptions = useMemo((): HistoryUserOption[] => {
    if (!usersData?.data) return [];

    const profilesMap = new Map(profiles?.map((p) => [p.uid, p]) ?? []);

    return usersData.data.map((user) => {
      const profile = user.user_profile_uid
        ? (profilesMap.get(user.user_profile_uid) as UserProfileWithAvatar | undefined)
        : undefined;

      return {
        userId: user.user_id,
        profile,
        displayName: profile?.user?.full_name || profile?.user?.username || user.user_id,
      };
    });
  }, [usersData, profiles]);

  return {
    userOptions,
    isLoading: isLoadingUsers || (profileUids.length > 0 && isLoadingProfiles),
  };
};
