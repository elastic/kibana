/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

const NO_PROFILE_STATUS_CODES = new Set([401, 403, 404]);

export const useCurrentUserProfile = () => {
  const { services } = useKibana<CoreStart>();

  return useQuery<UserProfileWithAvatar | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      try {
        return await services.http.get<UserProfileWithAvatar>('/internal/security/user_profile', {
          query: { dataPath: 'avatar' },
        });
      } catch (err) {
        // Only swallow expected "no profile" responses (anonymous / proxy-auth users).
        // Transient network/server errors are re-thrown so the query stays retryable.
        if (isHttpFetchError(err) && NO_PROFILE_STATUS_CODES.has(err.response?.status ?? 0)) {
          return null;
        }
        throw err;
      }
    },
    staleTime: Infinity,
  });
};
