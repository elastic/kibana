/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export interface MaintenanceWindowsPublicSetupDependencies {
  management: ManagementSetup;
}

export interface MaintenanceWindowsPublicStartDependencies {
  licensing: LicensingPluginStart;
  spaces: SpacesPluginStart;
  serverless?: ServerlessPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
}
