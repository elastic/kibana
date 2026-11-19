/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useBulkGetUserProfiles } from '../../../../../containers/user_profiles/use_bulk_get_user_profiles';

interface UseUserPickerProfilesParams {
  suggestedProfiles: UserProfileWithAvatar[];
  missingUids: string[];
}

interface UseUserPickerProfilesResult {
  allKnownProfiles: UserProfileWithAvatar[];
  isLoadingBulk: boolean;
}

export const useUserPickerProfiles = ({
  suggestedProfiles,
  missingUids,
}: UseUserPickerProfilesParams): UseUserPickerProfilesResult => {
  const { data: bulkProfiles = new Map(), isFetching: isLoadingBulk } = useBulkGetUserProfiles({
    uids: missingUids,
  });

  const allKnownProfiles = useMemo(
    () => [...suggestedProfiles, ...Array.from(bulkProfiles.values())],
    [suggestedProfiles, bulkProfiles]
  );

  return { allKnownProfiles, isLoadingBulk };
};
