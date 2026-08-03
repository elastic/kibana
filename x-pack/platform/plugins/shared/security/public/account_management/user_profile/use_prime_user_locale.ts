/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';

import { getAvailableLocales, i18n, toCanonicalLocaleId } from '@kbn/i18n';
import { useUpdateUserProfile } from '@kbn/user-profile-components';

/**
 * Silently writes the server-configured locale (from `kibana.yml`'s `i18n.locale`) to
 * the user's profile when they have no saved locale preference. This "primes" the
 * profile so the User Profile form has a concrete pre-selection that matches what
 * the user is actually seeing — avoiding a misleading empty/indeterminate state.
 *
 * When the user has no profile override, the client's `i18n.getLocale()` equals the
 * server-configured locale (the server embedded it in the translations URL). So we
 * can read it directly on the client and save it back.
 *
 * The save is one-shot per component mount and suppresses the success notification
 * so the user is unaware it happened.
 */
export const usePrimeUserLocale = () => {
  const { update, userProfileData, userProfileLoaded } = useUpdateUserProfile({
    notificationSuccess: { enabled: false },
  });
  const hasPrimed = useRef(false);

  useEffect(() => {
    if (hasPrimed.current) return;
    if (!userProfileLoaded) return;
    if (userProfileData?.userSettings?.locale) return;

    const availableLocales = getAvailableLocales();
    // No picker is enabled in this deployment, so there is nothing to prime.
    if (availableLocales.length === 0) return;

    hasPrimed.current = true;
    update({
      userSettings: { locale: toCanonicalLocaleId(i18n.getLocale(), availableLocales) },
    });
  }, [update, userProfileData, userProfileLoaded]);
};
