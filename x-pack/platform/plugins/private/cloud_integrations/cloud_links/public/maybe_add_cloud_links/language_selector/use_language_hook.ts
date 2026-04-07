/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useUpdateUserProfile, type LocaleValue as Locale } from '@kbn/user-profile-components';

const DEFAULT_LOCALE = 'en';

interface LanguageAPI {
  locale: Locale;
  initialLocaleValue: Locale;
  isVisible: boolean;
  isLoading: boolean;
  onChange: (locale: Locale, updateUserProfile: boolean) => void;
}

export const useLanguage = (): LanguageAPI => {
  const { userProfileData, isLoading, update, userProfileLoaded } = useUpdateUserProfile({
    notificationSuccess: {
      title: i18n.translate('xpack.cloudLinks.userMenuLinks.language.successNotificationTitle', {
        defaultMessage: 'Language settings updated',
      }),
      pageReloadText: i18n.translate(
        'xpack.cloudLinks.userMenuLinks.language.successNotificationText',
        {
          defaultMessage: 'Reload the page to see the changes',
        }
      ),
    },
    pageReloadChecker: (prev, next) => {
      return prev?.userSettings?.locale !== next.userSettings?.locale;
    },
  });

  const { userSettings: { locale: localeUserProfile = DEFAULT_LOCALE } = {} } = userProfileData ?? {
    userSettings: {},
  };

  const [locale, setLocale] = useState<Locale>(localeUserProfile);
  const [initialLocaleValue, setInitialLocaleValue] = useState<Locale>(localeUserProfile);

  const onChange = useCallback(
    (updatedLocale: Locale, persist: boolean) => {
      if (isLoading) {
        return;
      }

      setLocale(updatedLocale);

      if (!persist) {
        return;
      }

      return update({
        userSettings: {
          locale: updatedLocale,
        },
      });
    },
    [isLoading, update]
  );

  useEffect(() => {
    setLocale(localeUserProfile);
  }, [localeUserProfile]);

  useEffect(() => {
    if (userProfileLoaded) {
      const storedLocale = userProfileData?.userSettings?.locale;
      if (storedLocale) {
        setInitialLocaleValue(storedLocale);
      }
    }
  }, [userProfileData, userProfileLoaded]);

  return {
    locale,
    initialLocaleValue,
    isVisible: Boolean(userProfileData),
    isLoading,
    onChange,
  };
};
