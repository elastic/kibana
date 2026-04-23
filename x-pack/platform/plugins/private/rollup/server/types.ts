/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import type { IndexManagementPluginSetup } from '@kbn/index-management-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { DataViewsServerPluginSetup } from '@kbn/data-views-plugin/server';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import type { License } from './services';

export interface Dependencies {
  indexManagement?: IndexManagementPluginSetup;
  usageCollection?: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  dataViews: DataViewsServerPluginSetup;
  data: DataPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
  lib: {
    handleEsError: typeof handleEsError;
  };
}
