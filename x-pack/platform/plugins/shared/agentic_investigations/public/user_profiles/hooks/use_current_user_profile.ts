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

// 404 = no Elastic profile for this user (anonymous / proxy-auth / not a native user).
// 403 = the user exists but cannot fetch their own profile (very unusual, but durable).
// 401 is deliberately excluded: it typically signals a transient session-token rotation or
//     a reverse-proxy hiccup. Caching it as `null` would permanently block private-mode
//     escalation creates for the rest of the session. Let react-query retry on 401.
const NO_PROFILE_STATUS_CODES = new Set([403, 404]);

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
        // Only swallow durable "no profile" responses. Transient errors (401, network
        // failures) are re-thrown so the query stays retryable via react-query's retry logic.
        if (isHttpFetchError(err) && NO_PROFILE_STATUS_CODES.has(err.response?.status ?? 0)) {
          return null;
        }
        throw err;
      }
    },
    // Five-minute stale window: long enough to avoid redundant requests during a session,
    // short enough to recover after a transient auth blip on the next mount.
    staleTime: 5 * 60 * 1000,
  });
};
