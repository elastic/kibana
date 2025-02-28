/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageListItem } from '../../../../../../../common';

export type PackageInstallationStatus =
  | 'not_installed'
  | 'installing'
  | 'installed'
  | 'install_failed'
  | 'upgrade_failed'
  | 'upgrade_available';

export type PackageListItemWithExtra = PackageListItem & {
  extra: {
    installation_status: PackageInstallationStatus;
  };
};

export interface InstalledIntegrationsFilter {
  installationStatus?: PackageInstallationStatus[];
  customIntegrations?: boolean;
  q?: string;
}
