/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import {
  UserProfilesKibanaProvider,
  useUpdateUserProfile,
  type DarkModeValue as ColorMode,
} from '@kbn/user-profile-components';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';

interface Props {
  security: SecurityPluginStart;
  core: CoreStart;
}

// Dev-only core API that swaps the active color theme in place (no page reload). Not part of the
// public `ThemeServiceStart` type, so we access it defensively and fall back to a reload if absent.
type ThemeWithLiveSwitch = CoreStart['theme'] & { setDarkMode?: (darkMode: boolean) => void };

const systemPrefersDark = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

/**
 * A single light/dark toggle button for the header. Clicking flips the color mode, applies it live
 * and persists it to the user profile — no page reload, so any unsaved in-session work is kept.
 */
export const AppearanceToggle = ({ security, core }: Props) => {
  return (
    <UserProfilesKibanaProvider core={core} security={security} toMountPoint={toMountPoint}>
      <AppearanceToggleUI security={security} core={core} />
    </UserProfilesKibanaProvider>
  );
};

function AppearanceToggleUI({ core }: Props) {
  const { euiTheme } = useEuiTheme();
  const { userProfileData, update } = useUpdateUserProfile({
    // We apply the change live and reflect it ourselves, so no "reload the page" toast is needed.
    notificationSuccess: { enabled: false },
  });

  // If a value is forced in kibana.yml (uiSettings.overrides.theme:darkMode) the user can't change it.
  const valueSetInKibanaConfig = core.uiSettings.isOverridden('theme:darkMode');
  const isVisible = !valueSetInKibanaConfig && Boolean(userProfileData);

  const currentColorMode: ColorMode = userProfileData?.userSettings?.darkMode ?? 'system';
  const isDarkActive =
    currentColorMode === 'dark' || (currentColorMode === 'system' && systemPrefersDark());

  if (!isVisible) {
    return null;
  }

  // Apply the color mode to the running app without reloading. Returns false if the live-switch
  // API isn't available, so the caller can fall back to a reload.
  const applyColorModeLive = (dark: boolean): boolean => {
    const theme = core.theme as ThemeWithLiveSwitch;
    if (typeof theme.setDarkMode !== 'function') {
      return false;
    }
    theme.setDarkMode(dark);
    return true;
  };

  const toggle = async () => {
    const nextMode: Extract<ColorMode, 'light' | 'dark'> = isDarkActive ? 'light' : 'dark';

    const appliedLive = applyColorModeLive(nextMode === 'dark');

    // Persist the preference (partial update keeps other user settings, e.g. contrast, intact).
    try {
      await update({ userSettings: { darkMode: nextMode } });
    } catch {
      // Ignore persistence errors: the mode is already applied for this session.
    }

    // Only reload if we couldn't switch the theme in place.
    if (!appliedLive) {
      window.location.reload();
    }
  };

  const label = isDarkActive
    ? i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceToggle.switchToLight', {
        defaultMessage: 'Switch to light mode',
      })
    : i18n.translate('xpack.cloudLinks.userMenuLinks.appearanceToggle.switchToDark', {
        defaultMessage: 'Switch to dark mode',
      });

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span
        aria-hidden
        style={{
          width: 1,
          height: euiTheme.size.base,
          backgroundColor: euiTheme.colors.lightShade,
          marginInline: euiTheme.size.xs,
        }}
      />
      <EuiToolTip content={label}>
        <EuiButtonIcon
          aria-label={label}
          iconType={isDarkActive ? 'sun' : 'moon'}
          color="text"
          display="empty"
          onClick={toggle}
          data-test-subj="appearanceToggle"
        />
      </EuiToolTip>
    </span>
  );
}
