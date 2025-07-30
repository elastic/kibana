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
  type ContrastModeValue as ContrastMode,
} from '@kbn/user-profile-components';

interface Deps {
  uiSettingsClient: IUiSettingsClient;
  defaultColorMode: ColorMode;
  defaultContrastMode: ContrastMode;
}

interface AppearanceAPI {
  setColorMode: (colorMode: ColorMode, updateUserProfile: boolean) => void;
  colorMode: ColorMode;
  initialColorModeValue: ColorMode;
  setContrastMode: (contrastMode: ContrastMode, updateUserProfile: boolean) => void;
  contrastMode: ContrastMode;
  initialContrastModeValue: ContrastMode;
  isVisible: boolean;
  isLoading: boolean;
  onChange: (
    opts: { colorMode?: ColorMode; contrastMode?: ContrastMode },
    updateUserProfile: boolean
  ) => void;
}

interface ChangeOpts {
  colorMode?: ColorMode;
  contrastMode?: ContrastMode;
}

export const useAppearance = ({
  uiSettingsClient,
  defaultColorMode,
  defaultContrastMode,
}: Deps): AppearanceAPI => {
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
      const hasChangedDarkMode = prev?.userSettings?.darkMode !== next.userSettings?.darkMode;
      const hasChangedContrastMode =
        prev?.userSettings?.contrastMode !== next.userSettings?.contrastMode;
      return hasChangedDarkMode || hasChangedContrastMode;
    },
  });

  const {
    userSettings: {
      darkMode: colorModeUserProfile = defaultColorMode,
      contrastMode: contrastModeUserProfile = defaultContrastMode,
    } = {},
  } = userProfileData ?? {
    userSettings: {},
  };

  const [colorMode, setColorMode] = useState<ColorMode>(colorModeUserProfile);
  const [initialColorModeValue, setInitialColorModeValue] =
    useState<ColorMode>(colorModeUserProfile);

  const [contrastMode, setContrastMode] = useState<ContrastMode>(contrastModeUserProfile);
  const [initialContrastModeValue, setInitialContrastModeValue] =
    useState<ContrastMode>(contrastModeUserProfile);

  const onChange = useCallback(
    (
      { colorMode: updatedColorMode, contrastMode: updatedContrastMode }: ChangeOpts,
      persist: boolean
    ) => {
      if (isLoading) {
        return;
      }

      // optimistic update
      if (updatedColorMode) {
        setColorMode(updatedColorMode);
      }
      if (updatedContrastMode) {
        setContrastMode(updatedContrastMode);
      }

      if (!persist) {
        return;
      }

      return update({
        userSettings: {
          darkMode: updatedColorMode,
          contrastMode: updatedContrastMode,
        },
      });
    },
    [isLoading, update]
  );

  useEffect(() => {
    setColorMode(colorModeUserProfile);
    setContrastMode(contrastModeUserProfile);
  }, [colorModeUserProfile, contrastModeUserProfile]);

  useEffect(() => {
    if (userProfileLoaded) {
      const { darkMode: storedValueDarkMode, contrastMode: storedValueContrastMode } =
        userProfileData?.userSettings ?? {};

      if (storedValueDarkMode) {
        setInitialColorModeValue(storedValueDarkMode);
      }
      if (storedValueContrastMode) {
        setInitialContrastModeValue(storedValueContrastMode);
      }
    }
  }, [userProfileData, userProfileLoaded]);

  return {
    setColorMode,
    colorMode,
    initialColorModeValue,
    setContrastMode,
    contrastMode,
    initialContrastModeValue,
    isVisible: valueSetInKibanaConfig ? false : Boolean(userProfileData),
    isLoading,
    onChange,
  };
};
