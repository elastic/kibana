/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterButton,
  EuiFilterGroup,
  useEuiTheme,
  EuiFieldSearch,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import type { InstalledIntegrationsFilter, PackageInstallationStatus } from '../types';
import { useAddUrlFilters } from '../hooks/use_url_filters';

export const InstalledIntegrationsSearchBar: React.FunctionComponent<{
  filters: InstalledIntegrationsFilter;
}> = ({ filters }) => {
  const addUrlFilter = useAddUrlFilters();
  const theme = useEuiTheme();

  const statuses: Array<{
    iconType: string;
    iconColor: string;
    status: PackageInstallationStatus;
    label: React.ReactElement;
  }> = useMemo(
    () => [
      {
        iconType: 'warning',
        iconColor: theme.euiTheme.colors.textWarning,
        status: 'upgrade_available',

        label: (
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.upgradeAvailableFilterLabel"
            defaultMessage="Upgrade"
          />
        ),
      },
      {
        iconType: 'error',
        iconColor: theme.euiTheme.colors.textDanger,
        status: 'upgrade_failed',

        label: (
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.upgradeFailerFilterLabel"
            defaultMessage="Upgrade failed"
          />
        ),
      },
      {
        iconType: 'error',
        iconColor: theme.euiTheme.colors.textDanger,
        status: 'install_failed',

        label: (
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.installFailerFilterLabel"
            defaultMessage="Install failed"
          />
        ),
      },
      {
        iconType: 'checkInCircleFilled',
        iconColor: theme.euiTheme.colors.textSuccess,
        status: 'installed',
        label: (
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.installedFilterLabel"
            defaultMessage="Installed"
          />
        ),
      },
    ],
    [theme]
  );

  return (
    <div>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFieldSearch fullWidth />
        </EuiFlexItem>
        {statuses.map((item) => (
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <EuiFilterButton
                iconType={item.iconType}
                iconSide="left"
                css={css`
                  .euiIcon {
                    color: ${item.iconColor};
                  }
                `}
                hasActiveFilters={filters.installationStatus?.includes(item.status)}
                onClick={() => {
                  if (!filters.installationStatus?.includes(item.status)) {
                    addUrlFilter({
                      installationStatus: [item.status],
                    });
                  } else {
                    addUrlFilter({
                      installationStatus: [],
                    });
                  }
                }}
              >
                {item.label}
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
