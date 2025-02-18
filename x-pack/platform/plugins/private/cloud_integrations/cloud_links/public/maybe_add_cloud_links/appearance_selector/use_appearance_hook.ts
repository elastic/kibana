/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import {
  useUpdateUserProfile,
  type DarkModeValue as ColorMode,
} from '@kbn/user-profile-components';

interface Deps {
  uiSettingsClient: IUiSettingsClient;
  defaultColorMode: ColorMode;
}

export const useAppearance = ({ uiSettingsClient, defaultColorMode }: Deps) => {
  // If a value is set in kibana.yml (uiSettings.overrides.theme:darkMode)
  // we don't allow the user to change the theme color.
  const valueSetInKibanaConfig = uiSettingsClient.isOverridden('theme:darkMode');

  const { userProfileData, isLoading, update, userProfileLoaded } = useUpdateUserProfile({
    notificationSuccess: {
      title: i18n.translate('xpack.cloudLinks.userMenuLinks.appearance.successNotificationTitle', {
        defaultMessage: 'Appearance settings updated',
      }),
      pageReloadText: i18n.translate(
        'xpack.cloudLinks.userMenuLinks.appearance.successNotificationText',
        {
          defaultMessage: 'Reload the page to see the changes',
        }
      ),
    },
    pageReloadChecker: (prev, next) => {
      return prev?.userSettings?.darkMode !== next.userSettings?.darkMode;
    },
  });

  const { userSettings: { darkMode: colorModeUserProfile = defaultColorMode } = {} } =
    userProfileData ?? {
      userSettings: {},
    };

  const [colorMode, setColorMode] = useState<ColorMode>(colorModeUserProfile);
  const [initialColorModeValue, setInitialColorModeValue] =
    useState<ColorMode>(colorModeUserProfile);

  const onChange = useCallback(
    ({ colorMode: updatedColorMode }: { colorMode?: ColorMode }, persist: boolean) => {
      if (isLoading) {
        return;
      }

      // optimistic update
      if (updatedColorMode) {
        setColorMode(updatedColorMode);
      }

      // TODO: here we will update the contrast when available

      if (!persist) {
        return;
      }

      return update({
        userSettings: {
          darkMode: updatedColorMode,
        },
      });
    },
    [isLoading, update]
  );

  useEffect(() => {
    setColorMode(colorModeUserProfile);
  }, [colorModeUserProfile]);

  useEffect(() => {
    if (userProfileLoaded) {
      const storedValue = userProfileData?.userSettings?.darkMode;
      if (storedValue) {
        setInitialColorModeValue(storedValue);
      }
    }
  }, [userProfileData, userProfileLoaded]);

  return {
    isVisible: valueSetInKibanaConfig ? false : Boolean(userProfileData),
    setColorMode,
    colorMode,
    onChange,
    isLoading,
    initialColorModeValue,
  };
};
