/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, HttpSetup, OverlayStart, ScopedHistory } from '@kbn/core/public';
import type { DocLinksStart } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { IndexManagementPluginSetup } from '@kbn/index-management-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ILicense } from '@kbn/licensing-types';

import type { BreadcrumbService } from './application/services/breadcrumbs';

export type { IndexLifecycleManagementPluginStart } from '@kbn/index-lifecycle-management-common-shared';

export interface SetupDependencies {
  usageCollection?: UsageCollectionSetup;
  management: ManagementSetup;
  indexManagement?: IndexManagementPluginSetup;
  share: SharePluginSetup;
  cloud?: CloudSetup;
  home?: HomePublicPluginSetup;
}
export interface StartDependencies {
  licensing: LicensingPluginStart;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface AppServicesContext {
  breadcrumbService: BreadcrumbService;
  license: ILicense;
  cloud?: CloudSetup;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  docLinks: DocLinksStart;
  overlays: OverlayStart;
  http: HttpSetup;
  history: ScopedHistory;
  capabilities: ApplicationStart['capabilities'];
}
