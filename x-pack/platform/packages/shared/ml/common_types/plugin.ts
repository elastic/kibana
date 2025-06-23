/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/public';

import type { MlLocatorParams } from './locator';

export interface MlPluginSetup {
  getLocator?: (() => Promise<LocatorPublic<MlLocatorParams>>) | undefined;
  getManagementLocator?: (() => Promise<MlManagementLocatorInternal>) | undefined;
  elasticModels?: ElasticModels | undefined;
}

export interface MlPluginStart {
  getLocator?: (() => Promise<LocatorPublic<MlLocatorParams>>) | undefined;
  getManagementLocator?: (() => Promise<MlManagementLocatorInternal>) | undefined;
  elasticModels?: ElasticModels | undefined;
  getMlApi: () => Promise<MlApi>;
  components: {
    AnomalySwimLane: typeof AnomalySwimLane;
  };
}
