/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { UserProfilesKibanaProvider } from '@kbn/user-profile-components';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { useThemeDarkmodeToggle } from './theme_darkmode_hook';

interface Props {
  security: SecurityPluginStart;
  core: CoreStart;
}

export const ThemeDarkModeToggle = ({ security, core }: Props) => {
  return (
    <UserProfilesKibanaProvider core={core} security={security} toMountPoint={toMountPoint}>
      <ThemeDarkModeToggleUi uiSettingsClient={core.uiSettings} />
    </UserProfilesKibanaProvider>
  );
};

function ThemeDarkModeToggleUi({ uiSettingsClient }: { uiSettingsClient: IUiSettingsClient }) {
  const toggleTextSwitchId = useGeneratedHtmlId({ prefix: 'toggleTextSwitch' });
  const { euiTheme } = useEuiTheme();

  const { isVisible, toggle, isDarkModeOn, colorScheme } = useThemeDarkmodeToggle({
    uiSettingsClient,
  });

  if (!isVisible) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xs">
      <EuiFlexItem>
        <EuiContextMenuItem
          icon={colorScheme === 'dark' ? 'moon' : 'sun'}
          size="s"
          onClick={() => {
            const on = colorScheme === 'light' ? true : false;
            toggle(on);
          }}
          data-test-subj="darkModeToggle"
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.darkModeToggle', {
            defaultMessage: 'Dark mode',
          })}
        </EuiContextMenuItem>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ paddingRight: euiTheme.size.m }}>
        <EuiSwitch
          label={
            isDarkModeOn
              ? i18n.translate('xpack.cloudLinks.userMenuLinks.darkModeOnLabel', {
                  defaultMessage: 'on',
                })
              : i18n.translate('xpack.cloudLinks.userMenuLinks.darkModeOffLabel', {
                  defaultMessage: 'off',
                })
          }
          showLabel={false}
          checked={isDarkModeOn}
          onChange={(e) => {
            toggle(e.target.checked);
          }}
          aria-describedby={toggleTextSwitchId}
          data-test-subj="darkModeToggleSwitch"
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
