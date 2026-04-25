/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginSetup } from '@kbn/data-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';

export interface Dependencies {
  home: HomePublicPluginSetup;
  management: ManagementSetup;
  licensing: LicensingPluginSetup;
  charts: ChartsPluginStart;
  data: DataPublicPluginSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
}
