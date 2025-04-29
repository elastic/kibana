/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';

import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

import { MlLicense } from '../../../common/license';
import { MlCapabilitiesService } from '../capabilities/check_capabilities';
import { fieldFormatServiceFactory } from '../services/field_format_service_factory';
import { HttpService } from '../services/http_service';
import { mlApiProvider } from '../services/ml_api_service';
import { mlUsageCollectionProvider } from '../services/usage_collection';
import { mlJobServiceFactory } from '../services/job_service';
import { indexServiceFactory } from './index_service';
import { TrainedModelsService } from '../model_management/trained_models_service';

/**
 * Provides global services available across the entire ML app.
 */
export function getMlGlobalServices(
  coreStart: CoreStart,
  dataViews: DataViewsContract,
  usageCollection?: UsageCollectionSetup
) {
  const httpService = new HttpService(coreStart.http);
  const mlApi = mlApiProvider(httpService);
  const mlJobService = mlJobServiceFactory(mlApi);
  const trainedModelsService = new TrainedModelsService(mlApi.trainedModels);
  // Note on the following services:
  // - `mlIndexUtils` is just instantiated here to be passed on to `mlFieldFormatService`,
  //   but it's not being made available as part of global services. Since it's just
  //   some stateless utils `useMlIndexUtils()` should be used from within components.
  // - `mlFieldFormatService` is a stateful legacy service that relied on "dependency cache",
  //   so because of its own state it needs to be made available as a global service.
  //   In the long run we should again try to get rid of it here and make it available via
  //   its own context or possibly without having a singleton like state at all, since the
  //   way this manages its own state right now doesn't consider React component lifecycles.
  const mlIndexUtils = indexServiceFactory(dataViews);
  const mlFieldFormatService = fieldFormatServiceFactory(mlApi, mlIndexUtils, mlJobService);

  return {
    httpService,
    mlApi,
    mlFieldFormatService,
    mlUsageCollection: mlUsageCollectionProvider(usageCollection),
    mlCapabilities: new MlCapabilitiesService(mlApi),
    mlLicense: new MlLicense(),
    trainedModelsService,
  };
}
