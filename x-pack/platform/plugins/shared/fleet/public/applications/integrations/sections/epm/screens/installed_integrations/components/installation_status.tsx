/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { InstalledPackagesUIInstallationStatus } from '../types';
import { useAddUrlFilters } from '../hooks/use_url_filters';

function getStatusText(status: InstalledPackagesUIInstallationStatus) {
  switch (status) {
    case 'installed':
      return i18n.translate('xpack.fleet.epmInstalledIntegrations.statusIntalledLabel', {
        defaultMessage: 'Installed',
      });
    case 'upgrade_failed':
      return i18n.translate('xpack.fleet.epmInstalledIntegrations.statusUpgradeFailedLabel', {
        defaultMessage: 'Upgrade failed',
      });
    case 'upgrade_available':
      return i18n.translate('xpack.fleet.epmInstalledIntegrations.statusUpgradeFailedLabel', {
        defaultMessage: 'Upgrade',
      });
    case 'install_failed':
      return i18n.translate('xpack.fleet.epmInstalledIntegrations.statusInstallFailedLabel', {
        defaultMessage: 'Install failed',
      });
    default:
      return i18n.translate('xpack.fleet.epmInstalledIntegrations.statusNotIntalledLabel', {
        defaultMessage: 'Not installed',
      });
  }
}

function getIconForStatus(status: InstalledPackagesUIInstallationStatus) {
  switch (status) {
    case 'installed':
      return <EuiIcon size="m" type="checkInCircleFilled" color="success" />;
    case 'upgrade_available':
      return <EuiIcon size="m" type="warning" color="warning" />;
    case 'upgrade_failed':
    case 'install_failed':
    default:
      return <EuiIcon size="m" type="error" color="danger" />;
  }
}

export const InstallationStatus: React.FunctionComponent<{
  status: InstalledPackagesUIInstallationStatus;
}> = React.memo(({ status }) => {
  const addUrlFilter = useAddUrlFilters();

  return (
    <EuiButtonEmpty
      size="s"
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        addUrlFilter({
          installationStatus: [status],
        });
      }}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>{getIconForStatus(status)}</EuiFlexItem>
        <EuiFlexItem grow={false}>{getStatusText(status)}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiButtonEmpty>
  );
});
