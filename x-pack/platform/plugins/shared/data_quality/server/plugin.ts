/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';

import { ManagementAppLocatorParams } from '@kbn/management-plugin/common/locator';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { Dependencies } from './types';
import { ELASTICSEARCH_FEATURE, KIBANA_FEATURE } from './features';
import {
  DatasetQualityDetailsLocatorDefinition,
  DatasetQualityLocatorDefinition,
} from '../common/locators';

export class DataQualityPlugin implements Plugin<void, void, any, any> {
  public setup(_coreSetup: CoreSetup, { features, share }: Dependencies) {
    features.registerKibanaFeature(KIBANA_FEATURE);
    features.registerElasticsearchFeature(ELASTICSEARCH_FEATURE);

    const managementLocator =
      share.url.locators.get<ManagementAppLocatorParams>(MANAGEMENT_APP_LOCATOR);

    if (managementLocator) {
      share.url.locators.create(
        new DatasetQualityLocatorDefinition({
          useHash: false,
          managementLocator,
        })
      );
      share.url.locators.create(
        new DatasetQualityDetailsLocatorDefinition({
          useHash: false,
          managementLocator,
        })
      );
    }
  }

  public start() {}

  public stop() {}
}
