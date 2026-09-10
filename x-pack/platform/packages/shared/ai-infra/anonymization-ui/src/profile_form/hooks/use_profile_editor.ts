/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import type { AnonymizationProfilesClient } from '../../common/services/profiles/client';
import { ensureProfilesApiError } from '../../common/services/profiles/errors';
import type { ProfilesApiError } from '../../common/services/profiles/errors';
import type { ProfilesQueryContext } from '../../common/types/profiles';
import { useProfileForm } from '../../common/hooks/use_profile_form';

interface UseProfileEditorParams {
  client: AnonymizationProfilesClient;
  context: ProfilesQueryContext;
  profileId?: string;
}

interface ProfileEditorController {
  profile?: AnonymizationProfile;
  isLoadingProfile: boolean;
  loadError?: ProfilesApiError;
  loadProfileById: (profileId: string) => Promise<void>;
  form: ReturnType<typeof useProfileForm>;
}

export const useProfileEditor = ({
  client,
  context,
  profileId,
}: UseProfileEditorParams): ProfileEditorController => {
  const [profile, setProfile] = useState<AnonymizationProfile | undefined>();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [loadError, setLoadError] = useState<ProfilesApiError | undefined>();

  const loadProfileById = useCallback(
    async (id: string) => {
      setIsLoadingProfile(true);
      setLoadError(undefined);
      try {
        const loadedProfile = await client.getProfile(id);
        setProfile(loadedProfile);
      } catch (error) {
        setProfile(undefined);
        setLoadError(ensureProfilesApiError(error, 'Unable to load anonymization profile'));
      } finally {
        setIsLoadingProfile(false);
      }
    },
    [client]
  );

  useEffect(() => {
    if (!profileId) {
      setProfile(undefined);
      setLoadError(undefined);
      setIsLoadingProfile(false);
      return;
    }

    void loadProfileById(profileId);
  }, [loadProfileById, profileId]);

  const form = useProfileForm({
    client,
    context,
    initialProfile: profile,
  });

  return useMemo(
    () => ({
      profile,
      isLoadingProfile,
      loadError,
      loadProfileById,
      form,
    }),
    [form, isLoadingProfile, loadError, loadProfileById, profile]
  );
};
