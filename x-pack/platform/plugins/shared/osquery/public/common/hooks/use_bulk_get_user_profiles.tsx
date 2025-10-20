/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../lib/kibana';
import { useErrorToast } from './use_error_toast';

export interface BulkGetUserProfilesArgs {
  security: SecurityPluginStart;
  uids: Set<string>;
}

export const bulkGetUserProfiles = async ({
  security,
  uids,
}: BulkGetUserProfilesArgs): Promise<UserProfile[]> => {
  if (uids.size === 0) {
    return [];
  }

  try {
    return await security.userProfiles.bulkGet({ uids, dataPath: 'avatar' });
  } catch (error) {
    return [];
  }
};

export const useBulkGetUserProfiles = ({ uids }: { uids: Set<string> }) => {
  const { security } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<UserProfileWithAvatar[]>(
    ['useBulkGetUserProfiles', ...Array.from(uids)],
    async () => bulkGetUserProfiles({ security, uids }),
    {
      retry: false,
      staleTime: Infinity,
      onError: (error) => {
        setErrorToast(error, { title: 'Failed to load user profiles' });
      },
    }
  );
};
