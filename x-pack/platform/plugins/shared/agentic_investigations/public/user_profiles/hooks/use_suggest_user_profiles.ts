/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import useDebounce from 'react-use/lib/useDebounce';
import { ESCALATIONS_SUGGEST_USERS_URL } from '../../../common/escalations/constants';

const DEFAULT_SIZE = 10;
const DEBOUNCE_MS = 250;

/**
 * Suggests user profiles for the private-escalation collaborator picker.
 *
 * Uses `core.userProfile.suggest` rather than a raw HTTP call. That client method is the
 * sanctioned pattern for internal suggest routes (see `examples/user_profile_examples`), and
 * suggest routes are deliberately unversioned — the core client sends no `elastic-api-version`
 * header, so the route must not require one either.
 *
 * The backing route (`ESCALATIONS_SUGGEST_USERS_URL`) is owned by this plugin and requires
 * only `ESCALATIONS_API_PRIVILEGE_MANAGE`, so a user with `escalations_all` does not need a
 * separate Agent Builder read privilege to fetch collaborator suggestions.
 */
export const useSuggestUserProfiles = (searchTerm: string) => {
  const { services } = useKibana<CoreStart>();
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useDebounce(() => setDebouncedTerm(searchTerm), DEBOUNCE_MS, [searchTerm]);

  return useQuery<UserProfileWithAvatar[]>({
    queryKey: ['suggestUserProfiles', debouncedTerm],
    // Guard: core.userProfile is only available when the security plugin is present.
    enabled: Boolean(services.userProfile),
    queryFn: async () => {
      if (!services.userProfile) return [];
      return services.userProfile.suggest<UserProfileWithAvatar['data']>(
        ESCALATIONS_SUGGEST_USERS_URL,
        { name: debouncedTerm, size: DEFAULT_SIZE, dataPath: 'avatar' }
      ) as Promise<UserProfileWithAvatar[]>;
    },
    keepPreviousData: true,
    staleTime: 60_000,
    onError: (error: unknown) => {
      // Surface 403/network failures so the analyst sees why the picker is empty.
      services.notifications?.toasts.addError(
        error instanceof Error ? error : new Error(String(error)),
        { title: 'Could not load collaborator suggestions' }
      );
    },
  });
};
