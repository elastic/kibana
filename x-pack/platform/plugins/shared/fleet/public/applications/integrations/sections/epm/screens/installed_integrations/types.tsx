/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageListItem } from '../../../../../../../common';

export type InstalledPackagesUIInstallationStatus =
  | 'not_installed'
  | 'installing'
  | 'installed'
  | 'install_failed'
  | 'upgrade_failed'
  | 'upgrading'
  | 'upgrade_available'
  | 'uninstalling';

export type InstalledPackageUIPackageListItem = PackageListItem & {
  ui: {
    installation_status: InstalledPackagesUIInstallationStatus;
  };
};

export interface InstalledIntegrationsFilter {
  installationStatus?: InstalledPackagesUIInstallationStatus[];
  customIntegrations?: boolean;
  q?: string;
}
