/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { useUpdateUserProfile } from '@kbn/user-profile-components';
import useMountedState from 'react-use/lib/useMountedState';

interface Deps {
  uiSettingsClient: IUiSettingsClient;
}

export const useThemeDarkmodeToggle = ({ uiSettingsClient }: Deps) => {
  const [isDarkModeOn, setIsDarkModeOn] = useState(false);
  const isMounted = useMountedState();

  // If a value is set in kibana.yml (uiSettings.overrides.theme:darkMode)
  // we don't allow the user to change the theme color.
  const valueSetInKibanaConfig = uiSettingsClient.isOverridden('theme:darkMode');

  const { userProfileData, isLoading, update } = useUpdateUserProfile({
    notificationSuccess: {
      title: i18n.translate('xpack.cloudLinks.userMenuLinks.darkMode.successNotificationTitle', {
        defaultMessage: 'Color theme updated',
      }),
      pageReloadText: i18n.translate(
        'xpack.cloudLinks.userMenuLinks.darkMode.successNotificationText',
        {
          defaultMessage: 'Reload the page to see the changes',
        }
      ),
    },
    pageReloadChecker: (prev, next) => {
      return prev?.userSettings?.darkMode !== next.userSettings?.darkMode;
    },
  });

  const {
    userSettings: {
      darkMode: colorScheme = uiSettingsClient.get('theme:darkMode') === true ? 'dark' : 'light',
    } = {},
  } = userProfileData ?? {
    userSettings: {},
  };

  const toggle = useCallback(
    (on: boolean) => {
      if (isLoading) {
        return;
      }

      // optimistic update
      setIsDarkModeOn(on);

      update({
        userSettings: {
          darkMode: on ? 'dark' : 'light',
        },
      });
    },
    [isLoading, update]
  );

  useEffect(() => {
    if (!isMounted()) return;
    setIsDarkModeOn(colorScheme === 'dark');
  }, [isMounted, colorScheme]);

  return {
    isVisible: valueSetInKibanaConfig ? false : Boolean(userProfileData),
    toggle,
    isDarkModeOn,
    colorScheme,
  };
};
