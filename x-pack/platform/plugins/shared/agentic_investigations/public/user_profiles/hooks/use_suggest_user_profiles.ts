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
import { i18n } from '@kbn/i18n';
import { ESCALATIONS_SUGGEST_USERS_URL } from '../../../common/escalations/constants';
import { userProfileQueryKeys } from '../query_keys';

const DEFAULT_SIZE = 10;
const DEBOUNCE_MS = 250;

const SUGGEST_ERROR_TITLE = i18n.translate(
  'xpack.agenticInvestigations.userProfiles.suggestErrorTitle',
  { defaultMessage: 'Could not load user suggestions' }
);

/**
 * Suggests user profiles matching a search term. Used by both the escalation assignee
 * popover (queue) and the collaborator picker (create-escalation modal).
 *
 * Uses `core.userProfile.suggest` against the plugin-owned route
 * (`ESCALATIONS_SUGGEST_USERS_URL`), which requires only `ESCALATIONS_API_PRIVILEGE_MANAGE`.
 * This avoids the Agent Builder read-privilege dependency.
 *
 * Pass `enabled: false` to suppress the request when the caller lacks the privilege
 * (e.g. SHOW-only analysts viewing the queue), preventing a 403 toast on page load.
 */
export const useSuggestUserProfiles = (
  searchTerm: string,
  opts?: { size?: number; enabled?: boolean }
) => {
  const { services } = useKibana<CoreStart>();
  const size = opts?.size ?? DEFAULT_SIZE;
  const callerEnabled = opts?.enabled !== false;

  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  useDebounce(() => setDebouncedTerm(searchTerm), DEBOUNCE_MS, [searchTerm]);

  return useQuery<UserProfileWithAvatar[]>({
    queryKey: userProfileQueryKeys.suggest(debouncedTerm, size),
    enabled: callerEnabled && Boolean(services.userProfile),
    queryFn: async () => {
      if (!services.userProfile) return [];
      return services.userProfile.suggest<UserProfileWithAvatar['data']>(
        ESCALATIONS_SUGGEST_USERS_URL,
        { name: debouncedTerm, size, dataPath: 'avatar' }
      ) as Promise<UserProfileWithAvatar[]>;
    },
    keepPreviousData: true,
    staleTime: 60_000,
    onError: (error: unknown) => {
      services.notifications?.toasts.addError(
        error instanceof Error ? error : new Error(String(error)),
        { title: SUGGEST_ERROR_TITLE }
      );
    },
  });
};
