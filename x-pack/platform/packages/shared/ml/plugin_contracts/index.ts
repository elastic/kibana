/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { IElasticModels } from '@kbn/ml-trained-models-utils';
import type { MlLocatorParams, MlManagementLocator } from '@kbn/ml-common-types/locator';
import type { MlApi } from '@kbn/ml-services/ml_api_service';
import type { AnomalySwimLaneComponentType } from '@kbn/ml-common-types/anomaly_swim_lane';

export interface MlPluginSetup {
  locator?: LocatorPublic<MlLocatorParams>;
  getManagementLocator?: (() => Promise<MlManagementLocator>) | undefined;
  getElasticModels?: (() => Promise<IElasticModels>) | undefined;
}

export interface MlPluginStart {
  locator?: LocatorPublic<MlLocatorParams>;
  getManagementLocator?: (() => Promise<MlManagementLocator>) | undefined;
  getElasticModels?: (() => Promise<IElasticModels>) | undefined;
  getMlApi: () => Promise<MlApi>;
  components: {
    AnomalySwimLane: AnomalySwimLaneComponentType;
  };
}
