/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import { SOURCE_TYPES } from '@kbn/maps-plugin/common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { ML_APP_LOCATOR } from '@kbn/ml-common-types/locator_app_locator';
import type { MlPluginStart } from '@kbn/ml-plugin-contracts';
import type { MlStartDependencies } from '../plugin';
import { AnomalySource } from './anomaly_source';

export class AnomalySourceFactory {
  public readonly type = SOURCE_TYPES.ES_ML_ANOMALIES;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
  ) {}

  private async getServices(): Promise<{
    coreStart: CoreStart;
    mlLocator?: LocatorPublic<SerializableRecord>;
  }> {
    const [coreStart, pluginStart] = await this.getStartServices();
    const mlLocator = pluginStart.share.url.locators.get(ML_APP_LOCATOR);

    return { coreStart, mlLocator };
  }

  public async create(): Promise<any> {
    const { coreStart, mlLocator } = await this.getServices();
    AnomalySource.coreStart = coreStart;
    AnomalySource.mlLocator = mlLocator;
    return AnomalySource;
  }
}
