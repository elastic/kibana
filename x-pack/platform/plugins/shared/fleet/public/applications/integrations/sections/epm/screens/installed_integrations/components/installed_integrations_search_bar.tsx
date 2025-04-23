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
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';

import type {
  InstalledIntegrationsFilter,
  InstalledPackageUIPackageListItem,
  InstalledPackagesUIInstallationStatus,
} from '../types';
import { useAddUrlFilters } from '../hooks/use_url_filters';

import { InstalledIntegrationsActionMenu } from './installed_integration_action_menu';

const SEARCH_DEBOUNCE_MS = 250;

export const InstalledIntegrationsSearchBar: React.FunctionComponent<{
  filters: InstalledIntegrationsFilter;
  countPerStatus: { [k: string]: number | undefined };
  customIntegrationsCount: number;
  selectedItems: InstalledPackageUIPackageListItem[];
}> = ({ filters, countPerStatus, customIntegrationsCount, selectedItems }) => {
  const addUrlFilter = useAddUrlFilters();
  const theme = useEuiTheme();
  const [searchTerms, setSearchTerms] = useState(filters.q);

  useDebounce(
    () => {
      addUrlFilter({
        q: searchTerms,
      });
    },
    SEARCH_DEBOUNCE_MS,
    [searchTerms]
  );
  const statuses: Array<{
    iconType: string;
    iconColor: string;
    status: InstalledPackagesUIInstallationStatus;
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
    ],
    [theme]
  );

  return (
    <div>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFieldSearch
            defaultValue={filters.q}
            onChange={(e) => setSearchTerms(e.target.value)}
            placeholder={i18n.translate('xpack.fleet.serachBarPlaceholder', {
              defaultMessage: 'Search',
            })}
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            {statuses.map((item) => (
              <EuiFilterButton
                iconType={item.iconType}
                iconSide="left"
                css={css`
                  .euiIcon {
                    color: ${item.iconColor};
                  }
                `}
                hasActiveFilters={filters.installationStatus?.includes(item.status)}
                numFilters={countPerStatus[item.status] ?? 0}
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
            ))}
          </EuiFilterGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiFilterButton
              hasActiveFilters={filters.customIntegrations}
              numFilters={customIntegrationsCount}
              onClick={() => {
                if (filters.customIntegrations) {
                  addUrlFilter({
                    customIntegrations: undefined,
                  });
                } else {
                  addUrlFilter({
                    customIntegrations: true,
                  });
                }
              }}
            >
              <FormattedMessage
                id="xpack.fleet.epmInstalledIntegrations.customFilterLabel"
                defaultMessage="Custom"
              />
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <InstalledIntegrationsActionMenu selectedItems={selectedItems} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
