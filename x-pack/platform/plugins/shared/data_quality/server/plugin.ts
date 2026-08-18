/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { ELASTICSEARCH_FEATURE, KIBANA_FEATURE } from './features';
import {
  DatasetQualityDetailsLocatorDefinition,
  DatasetQualityLocatorDefinition,
} from '../common/locators';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class DataQualityPlugin extends Service {
  static readonly inject = ['features.setup', 'share.setup'];
  static readonly provide = 'dataQuality';

  constructor(ctx: Context) {
    super(ctx, 'dataQuality');
    const features = (ctx.get('features.setup') as any).contract;
    const share = (ctx.get('share.setup') as any).contract;
    features.registerKibanaFeature(KIBANA_FEATURE);
        features.registerElasticsearchFeature(ELASTICSEARCH_FEATURE);

        const managementLocator = share.url.locators.get(MANAGEMENT_APP_LOCATOR);

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
}
