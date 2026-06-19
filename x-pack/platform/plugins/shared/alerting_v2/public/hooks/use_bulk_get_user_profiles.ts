/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import type { UserProfile } from '@kbn/core-user-profile-common';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { useQuery } from '@kbn/react-query';
import { userProfileKeys } from './query_key_factory';

export type UserProfileMap = Map<string, UserProfile>;

const profilesToMap = (profiles: UserProfile[]): UserProfileMap =>
  profiles.reduce<UserProfileMap>((acc, profile) => {
    acc.set(profile.uid, profile);
    return acc;
  }, new Map());

export const useBulkGetUserProfiles = ({ uids }: { uids: string[] }) => {
  const userProfile = useService(CoreStart('userProfile')) as UserProfileService;

  return useQuery({
    queryKey: userProfileKeys.bulk(uids),
    queryFn: () => userProfile.bulkGet({ uids: new Set(uids) }),
    select: profilesToMap,
    enabled: uids.length > 0,
    keepPreviousData: true,
    staleTime: 60 * 1000,
    retry: false,
  });
};
