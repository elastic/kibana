/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import constate from 'constate';
import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import useObservable from 'react-use/lib/useObservable';

import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';

import { useSecurityApiClients } from '.';
import type { GetUserProfileResponse, UserProfileData } from '../../common';

export interface AuthenticationProviderProps {
  authc: AuthenticationServiceSetup;
}

const [AuthenticationProvider, useAuthentication] = constate(
  ({ authc }: AuthenticationProviderProps) => authc
);

export { AuthenticationProvider, useAuthentication };

const DEFAULT_DATA_PATHS = ['avatar', 'userSettings'] as const;
const DEFAULT_DATA_PATHS_KEY = DEFAULT_DATA_PATHS.toString();

export interface CurrentUser extends AuthenticatedUser {
  profile?: GetUserProfileResponse<UserProfileData> | null;
}

export function useUserProfile<T extends UserProfileData>(dataPath?: string) {
  const { userProfiles } = useSecurityApiClients();
  const dataUpdateState = useObservable(userProfiles.dataUpdates$);
  return useAsync(
    () => userProfiles.getCurrent<T>(dataPath ? { dataPath } : undefined),
    [userProfiles, dataPath, dataUpdateState]
  );
}

/**
 * Returns the current authenticated user together with their profile data in a single hook call.
 *
 * Pass `extraDataPaths` to include additional profile namespaces beyond the defaults
 * (`avatar`, `userSettings`). Duplicate default paths trigger a dev-mode warning.
 *
 * @example
 * const { user, isLoading } = useCurrentUser();
 * const { user } = useCurrentUser({ extraDataPaths: ['myPlugin'] });
 */
export function useCurrentUser(options?: { extraDataPaths?: string[] }) {
  const authc = useAuthentication();

  if (process.env.NODE_ENV !== 'production' && options?.extraDataPaths?.length) {
    const defaults = new Set<string>(DEFAULT_DATA_PATHS);
    const duplicates = options.extraDataPaths.filter((p) => defaults.has(p));
    if (duplicates.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `useCurrentUser: extraDataPaths includes paths already fetched by default: [${duplicates.join(
          ', '
        )}]. ` + `Default paths: [${DEFAULT_DATA_PATHS_KEY}]`
      );
    }
  }

  const dataPath = useMemo(
    () =>
      options?.extraDataPaths?.length
        ? [...new Set([...DEFAULT_DATA_PATHS, ...options.extraDataPaths])].sort().join(',')
        : DEFAULT_DATA_PATHS_KEY,
    [options?.extraDataPaths]
  );

  const authState = useAsync(authc.getCurrentUser, [authc]);
  const profileState = useUserProfile(dataPath);

  const user = useMemo<CurrentUser | null>(() => {
    if (!authState.value) return null;

    return {
      ...authState.value,
      profile: profileState.value ?? null,
    };
  }, [authState.value, profileState.value]);

  return {
    user,
    isLoading: authState.loading || profileState.loading,
    error: authState.error ?? profileState.error,
  };
}
