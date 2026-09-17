/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useKibana } from '../../common/lib/kibana';

export interface UseBulkGetUserProfilesParams {
  /** Profile UIDs to resolve. Duplicates are ignored; the query is disabled when empty. */
  uids: string[];
}

export type UseBulkGetUserProfilesResult = UseQueryResult<Map<string, string>>;

/**
 * Resolves a list of Elasticsearch user profile UIDs to display names, keyed by uid.
 */
export const useBulkGetUserProfiles = ({
  uids,
}: UseBulkGetUserProfilesParams): UseBulkGetUserProfilesResult => {
  const { userProfile } = useKibana().services;

  const uniqueUids = Array.from(new Set(uids)).sort();

  return useQuery({
    queryKey: ['useBulkGetUserProfiles', uniqueUids],
    queryFn: () => userProfile.bulkGet({ uids: new Set(uniqueUids) }),
    enabled: uniqueUids.length > 0,
    staleTime: 60 * 1000,
    retry: false,
    select: (data) => {
      const profileByUid = new Map<string, string>();
      data.forEach((profile) => {
        profileByUid.set(profile.uid, getUserDisplayName(profile.user));
      });
      return profileByUid;
    },
  });
};
