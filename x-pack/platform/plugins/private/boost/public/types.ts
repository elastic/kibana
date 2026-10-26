/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IndexManagementPluginStart } from '@kbn/index-management-shared-types';
import type { ManagementAppMountParams, ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

export interface BoostSetupDependencies {
  management: ManagementSetup;
}

export interface BoostStartDependencies {
  share: SharePluginStart;
  indexManagement?: IndexManagementPluginStart;
}

export type BoostServices = CoreStart &
  BoostStartDependencies & {
    /** The boost app's, which boost's parts in Index Management's pages don't have. */
    appParams?: ManagementAppMountParams;
  };
