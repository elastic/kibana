/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';

export const useCurrentUserProfileUid = (userProfile: UserProfileService) => {
  const [uid, setUid] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const profile = await userProfile.getCurrent();
        if (!cancelled) {
          setUid(profile?.uid);
        }
      } catch {
        if (!cancelled) {
          setUid(undefined);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [userProfile]);

  return uid;
};
