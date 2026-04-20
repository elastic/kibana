/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { queryKeys } from '../query_keys';

export interface UseBulkGetProfilesParams {
  userProfile: UserProfileService;
  /** Profile UIDs to fetch; the query stays idle when this list is empty. */
  uids: readonly string[];
  toasts: {
    addError: (error: Error, options: { title: string }) => void;
  };
  errorTitle: string;
}

/**
 * Fetches user profiles via UserProfileService.bulkGet with shared caching and error handling.
 */
export function useBulkGetProfiles({
  userProfile,
  uids,
  toasts,
  errorTitle,
}: UseBulkGetProfilesParams) {
  const dataPath = 'avatar';
  const queryKey = queryKeys.bulkGetProfiles(uids.map((uid) => uid));
  return useQuery({
    queryKey,
    queryFn: () =>
      userProfile.bulkGet({
        uids: new Set(uids),
        dataPath,
      }),
    enabled: uids.length > 0,
    retry: 1,
    onError: (err: unknown) => {
      toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: errorTitle,
      });
    },
  });
}
