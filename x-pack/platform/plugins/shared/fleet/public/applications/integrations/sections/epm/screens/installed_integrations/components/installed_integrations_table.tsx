/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  type CriteriaWithPagination,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { TableIcon } from '../../../../../../../components/package_icon';
import type { PackageListItem } from '../../../../../../../../common';
import { type UrlPagination, useLink, useAuthz } from '../../../../../../../hooks';
import type { InstalledPackageUIPackageListItem } from '../types';

import { InstallationVersionStatus } from './installation_version_status';
import { DisabledWrapperTooltip } from './disabled_wrapper_tooltip';

export const InstalledIntegrationsTable: React.FunctionComponent<{
  installedPackages: InstalledPackageUIPackageListItem[];
  total: number;
  isLoading: boolean;
  pagination: UrlPagination;
}> = ({ installedPackages, total, isLoading, pagination }) => {
  const authz = useAuthz();
  const { getHref } = useLink();

  const [selectedItems, setSelectedItems] = useState<InstalledPackageUIPackageListItem[]>([]);

  const { setPagination } = pagination;
  const handleTablePagination = React.useCallback(
    ({ page }: CriteriaWithPagination<InstalledPackageUIPackageListItem>) => {
      setPagination({
        currentPage: page.index + 1,
        pageSize: page.size,
      });
    },
    [setPagination]
  );

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.tableTotalCount"
          defaultMessage={'Showing {total, plural, one {# integration} other {# integrations}}'}
          values={{
            total,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        loading={isLoading}
        items={installedPackages}
        itemId="name"
        pagination={{
          pageIndex: pagination.pagination.currentPage - 1,
          totalItemCount: total,
          pageSize: pagination.pagination.pageSize,
          showPerPageOptions: true,
          pageSizeOptions: pagination.pageSizeOptions,
        }}
        onChange={handleTablePagination}
        selection={{
          selectable: () => true,
          selected: selectedItems,
          onSelectionChange: (newSelectedItems) => {
            setSelectedItems(newSelectedItems);
          },
        }}
        columns={[
          {
            name: i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.integrationNameColumnTitle',
              {
                defaultMessage: 'Integration name',
              }
            ),
            render: (item: PackageListItem) => {
              const url = getHref('integration_details_overview', {
                pkgkey: `${item.name}-${item.version}`,
              });

              return (
                <EuiLink href={url}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <TableIcon
                        size="m"
                        icons={item.icons}
                        packageName={item.name}
                        version={item.version}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>{item.title}</EuiFlexItem>
                  </EuiFlexGroup>
                </EuiLink>
              );
            },
          },
          {
            name: i18n.translate('xpack.fleet.epmInstalledIntegrations.versionColumnTitle', {
              defaultMessage: 'Version',
            }),
            render: (item: InstalledPackageUIPackageListItem) => (
              <InstallationVersionStatus item={item} />
            ),
          },
          {
            name: i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.attachedPoliciesColumnTitle',
              {
                defaultMessage: 'Attached policies',
              }
            ),
            width: '206px',
            render: (item: InstalledPackageUIPackageListItem) => {
              const policyCount = item.packagePoliciesInfo?.count ?? 0;
              if (!policyCount) {
                return null;
              }

              const isDisabled = !authz.fleet.readAgentPolicies;

              return (
                <DisabledWrapperTooltip
                  tooltipContent={
                    <FormattedMessage
                      id="xpack.fleet.epmInstalledIntegrations.agentPoliciesRequiredPermissionTooltip"
                      defaultMessage={
                        "You don't have permissions to view these policies. Contact your administrator."
                      }
                    />
                  }
                  disabled={isDisabled}
                >
                  <EuiLink onClick={() => {}} disabled={isDisabled}>
                    <FormattedMessage
                      id="xpack.fleet.epmInstalledIntegrations.viewAttachedPoliciesButton"
                      defaultMessage={
                        'View {policyCount, plural, one {# policies} other {# policies}}'
                      }
                      values={{
                        policyCount,
                      }}
                    />
                  </EuiLink>
                </DisabledWrapperTooltip>
              );
            },
          },
          // TODO Actions are not yet implemented to be done in https://github.com/elastic/kibana/issues/209867
          {
            actions: [
              {
                name: i18n.translate('xpack.fleet.epmInstalledIntegrations.upgradeActionLabel', {
                  defaultMessage: 'Upgrade',
                }),
                description: (item) =>
                  i18n.translate('xpack.fleet.epmInstalledIntegrations.upgradeActionDescription', {
                    defaultMessage: 'Upgrade to {version}.',
                    values: { version: item.version },
                  }),
                icon: 'refresh',
                type: 'icon',
                enabled: () => false,
              },
              {
                name: i18n.translate('xpack.fleet.epmInstalledIntegrations.viewPoliciesLabel', {
                  defaultMessage: 'View policies',
                }),
                icon: 'search',
                type: 'icon',
                description: i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.viewPoliciesLabel',
                  {
                    defaultMessage: 'View policies',
                  }
                ),
                enabled: (item) => (item?.packagePoliciesInfo?.count ?? 0) > 0,
              },
              {
                name: i18n.translate('xpack.fleet.epmInstalledIntegrations.editIntegrationLabel', {
                  defaultMessage: 'Edit integration',
                }),
                icon: 'pencil',
                type: 'icon',
                description: i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.editIntegrationLabel',
                  {
                    defaultMessage: 'Edit integration',
                  }
                ),
                enabled: () => false,
              },
              {
                name: i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.uninstallIntegrationLabel',
                  {
                    defaultMessage: 'Uninstall integration',
                  }
                ),
                icon: 'trash',
                type: 'icon',
                description: i18n.translate(
                  'xpack.fleet.epmInstalledIntegrations.uninstallIntegrationLabel',
                  {
                    defaultMessage: 'Uninstall integration',
                  }
                ),
                enabled: (item) => (item?.packagePoliciesInfo?.count ?? 0) === 0,
              },
            ],
          },
        ]}
      />
    </>
  );
};
