/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import { SOURCE_TYPES } from '@kbn/maps-plugin/common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { HttpService } from '../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
import { ML_APP_LOCATOR } from '../../common/constants/locator';
import type { MlApi } from '../application/services/ml_api_service';

export class AnomalySourceFactory {
  public readonly type = SOURCE_TYPES.ES_ML_ANOMALIES;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
  ) {}

  private async getServices(): Promise<{
    mlResultsService: MlApi['results'];
    mlLocator?: LocatorPublic<SerializableRecord>;
  }> {
    const [coreStart, pluginStart] = await this.getStartServices();
    const { mlApiProvider } = await import('../application/services/ml_api_service');
    const mlLocator = pluginStart.share.url.locators.get(ML_APP_LOCATOR);

    const httpService = new HttpService(coreStart.http);
    const mlResultsService = mlApiProvider(httpService).results;

    return { mlResultsService, mlLocator };
  }

  public async create(): Promise<any> {
    const { mlResultsService, mlLocator } = await this.getServices();
    const { AnomalySource } = await import('./anomaly_source');
    AnomalySource.mlResultsService = mlResultsService;
    AnomalySource.mlLocator = mlLocator;
    return AnomalySource;
  }
}
