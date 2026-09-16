/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_USER_PROFILES_API_PATH } from '@kbn/alerting-v2-constants';
import { queryKeys } from '../query_keys';

export interface UseSuggestedProfilesParams {
  userProfile: UserProfileService;
  /** Search string. An empty value lists profiles unfiltered rather than skipping the query. */
  searchTerm: string;
  toasts: {
    addError: (error: Error, options: { title: string }) => void;
  };
  errorTitle: string;
}

/**
 * Suggests user profiles via UserProfileService.suggest with shared caching and error handling.
 * Runs with an empty search term too, so callers can show an initial list of users.
 */
export function useSuggestedProfiles({
  userProfile,
  searchTerm,
  toasts,
  errorTitle,
}: UseSuggestedProfilesParams) {
  const trimmedSearch = searchTerm.trim();
  const queryKey = queryKeys.assigneeSuggestions(trimmedSearch);

  return useQuery({
    queryKey,
    queryFn: () =>
      userProfile.suggest(ALERTING_V2_INTERNAL_SUGGESTIONS_USER_PROFILES_API_PATH, {
        name: trimmedSearch,
        size: 20,
      }) as Promise<UserProfileWithAvatar[]>,
    retry: 1,
    onError: (err: unknown) => {
      toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: errorTitle,
      });
    },
  });
}
