/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageListItem } from '../../../../../../../common';
import type { UsePackageIconType } from '../../../../../../hooks';

export type InstalledPackagesUIInstallationStatus =
  | 'not_installed'
  | 'installing'
  | 'installed'
  | 'install_failed'
  | 'upgrade_failed'
  | 'upgrading'
  | 'upgrade_available'
  | 'pending_upgrade_review'
  | 'declined_review'
  | 'uninstalling'
  | 'rolling_back';

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

/** What a bottom panel needs to show its package in the title. */
export interface PanelPackage {
  name: string;
  title: string;
  version: string;
  /** Any icon shape `TableIcon` takes, so the package info of a package not on the page fits too. */
  icons?: UsePackageIconType['icons'];
}
