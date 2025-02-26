/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { TableIcon } from '../../../../../../../components/package_icon';
import type { PackageListItem } from '../../../../../../../../common';
import { useLink } from '../../../../../../../hooks';
import type { PackageListItemWithExtra } from '../types';

import { InstallationStatus } from './installation_status';

export const InstalledIntegrationsTable: React.FunctionComponent<{
  installedPackages: PackageListItemWithExtra[];
  isLoading: boolean;
}> = ({ installedPackages, isLoading }) => {
  const { getHref } = useLink();

  // TODO pagination

  return (
    <EuiBasicTable
      isLoading={isLoading}
      items={installedPackages}
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
          name: i18n.translate('xpack.fleet.epmInstalledIntegrations.versionColumnTitle', {
            defaultMessage: 'Version',
          }),
        },
        {
          name: i18n.translate('xpack.fleet.epmInstalledIntegrations.attachedPoliciesColumnTitle', {
            defaultMessage: 'Attached policies',
          }),
          // TODO custom render
          render: (item: PackageListItemWithExtra) => <>TODO</>,
        },
        {
          actions: [
            {
              name: 'test1',
              onClick: () => {},
            },
            {
              name: 'test2',
              onClick: () => {},
            },
            {
              name: 'test3',
              onClick: () => {},
            },
          ],
        },
      ]}
    />
  );
};
