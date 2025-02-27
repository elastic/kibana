/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { TableIcon } from '../../../../../../../components/package_icon';
import type { PackageListItem } from '../../../../../../../../common';
import { type UrlPagination, useLink } from '../../../../../../../hooks';
import type { PackageListItemWithExtra } from '../types';

import { InstallationStatus } from './installation_status';

export const InstalledIntegrationsTable: React.FunctionComponent<{
  installedPackages: PackageListItemWithExtra[];
  total: number;
  isLoading: boolean;
  pagination: UrlPagination;
}> = ({ installedPackages, total, isLoading, pagination }) => {
  const { getHref } = useLink();

  const { setPagination } = pagination;
  const handleTablePagination = React.useCallback(
    ({ page }: CriteriaWithPagination<PackageListItemWithExtra>) => {
      setPagination({
        currentPage: page.index + 1,
        pageSize: page.size,
      });
    },
    [setPagination]
  );

  return (
    <EuiBasicTable
      loading={isLoading}
      items={installedPackages}
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
      }}
      columns={[
        {
          name: i18n.translate('xpack.fleet.epmInstalledIntegrations.integrationNameColumnTitle', {
            defaultMessage: 'Integration name',
          }),
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
          name: i18n.translate('xpack.fleet.epmInstalledIntegrations.statusColumnTitle', {
            defaultMessage: 'Status',
          }),
          render: (item: PackageListItemWithExtra) => (
            <InstallationStatus status={item.extra.installation_status} />
          ),
        },
        {
          field: 'version',
          width: '126px',
          name: i18n.translate('xpack.fleet.epmInstalledIntegrations.versionColumnTitle', {
            defaultMessage: 'Version',
          }),
        },
        {
          name: i18n.translate('xpack.fleet.epmInstalledIntegrations.attachedPoliciesColumnTitle', {
            defaultMessage: 'Attached policies',
          }),
          width: '206px',
          render: (item: PackageListItemWithExtra) => {
            const policyCount = item.packagePoliciesInfo?.count ?? 0;
            if (!policyCount) {
              return null;
            }

            return (
              <EuiLink onClick={() => {}}>
                <FormattedMessage
                  id="xpack.fleet.epmInstalledIntegrations.viewAttachedPoliciesButton"
                  defaultMessage={'View {policyCount, plural, one {# policies} other {# policies}}'}
                  values={{
                    policyCount,
                  }}
                />
              </EuiLink>
            );
          },
        },
        {
          actions: [
            {
              name: 'test1',
              description: 'test1',
              onClick: () => {},
            },
            {
              name: 'test2',
              description: 'test2',
              onClick: () => {},
            },
            {
              name: 'test3',
              description: 'test3',
              onClick: () => {},
            },
          ],
        },
      ]}
    />
  );
};
