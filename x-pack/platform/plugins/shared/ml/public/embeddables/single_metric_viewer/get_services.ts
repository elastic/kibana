/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { MlPluginStart } from '@kbn/ml-plugin-contracts';
import type { MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import type { SingleMetricViewerEmbeddableServices, SingleMetricViewerServices } from '../types';

/**
 * Provides the ML services required by the Single Metric Viewer Embeddable.
 */
export const getMlServices = async (
  coreStart: CoreStart,
  pluginsStart: MlStartDependencies
): Promise<SingleMetricViewerServices> => {
  const [
    { HttpService },
    { AnomalyDetectorService },
    { AnomalyExplorerChartsService },
    { fieldFormatServiceFactory },
    { indexServiceFactory },
    { timeSeriesExplorerServiceFactory },
    { mlApiProvider },
    { mlResultsServiceProvider },
    { MlCapabilitiesService },
    { timeSeriesSearchServiceFactory },
    { toastNotificationServiceProvider },
    { mlJobServiceFactory },
  ] = await Promise.all([
    await import('@kbn/ml-services/http_service'),
    await import('../../application/services/anomaly_detector_service'),
    await import('../../application/services/anomaly_explorer_charts_service'),
    await import('@kbn/ml-services/field_format_service_factory'),
    await import('@kbn/ml-services/index_service'),
    await import('../../application/util/time_series_explorer_service'),
    await import('@kbn/ml-services/ml_api_service'),
    await import('@kbn/ml-services/results_service'),
    await import('@kbn/ml-services/capabilities/check_capabilities'),
    await import(
      '../../application/timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service'
    ),
    await import('../../application/services/toast_notification_service'),
    await import('@kbn/ml-services/job_service'),
  ]);

  const httpService = new HttpService(coreStart.http);
  const anomalyDetectorService = new AnomalyDetectorService(httpService);
  const mlApi = mlApiProvider(httpService);
  const toastNotificationService = toastNotificationServiceProvider(coreStart.notifications.toasts);
  const mlJobService = mlJobServiceFactory(mlApi);
  const mlResultsService = mlResultsServiceProvider(mlApi);
  const mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(mlResultsService, mlApi);
  const mlTimeSeriesExplorerService = timeSeriesExplorerServiceFactory(
    coreStart.uiSettings,
    mlApi,
    mlResultsService
  );
  const mlCapabilities = new MlCapabilitiesService(mlApi);
  const anomalyExplorerService = new AnomalyExplorerChartsService(
    pluginsStart.data.query.timefilter.timefilter,
    mlApi
  );
  // Note on the following services:
  // - `mlIndexUtils` is just instantiated here to be passed on to `mlFieldFormatService`,
  //   but it's not being made available as part of global services. Since it's just
  //   some stateless utils `useMlIndexUtils()` should be used from within components.
  // - `mlFieldFormatService` is a stateful legacy service that relied on "dependency cache",
  //   so because of its own state it needs to be made available as a global service.
  //   In the long run we should again try to get rid of it here and make it available via
  //   its own context or possibly without having a singleton like state at all, since the
  //   way this manages its own state right now doesn't consider React component lifecycles.
  const mlIndexUtils = indexServiceFactory(pluginsStart.data.dataViews);
  const mlFieldFormatService = fieldFormatServiceFactory(mlApi, mlIndexUtils, mlJobService);
  return {
    anomalyDetectorService,
    anomalyExplorerService,
    mlApi,
    mlCapabilities,
    mlFieldFormatService,
    mlResultsService,
    mlTimeSeriesSearchService,
    mlTimeSeriesExplorerService,
    toastNotificationService,
  };
};

/**
 * Provides the services required by the Single Metric Viewer Embeddable.
 */
export const getServices = async (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
): Promise<SingleMetricViewerEmbeddableServices> => {
  const [coreStart, pluginsStart] = await getStartServices();
  const mlServices = await getMlServices(coreStart, pluginsStart);

  return [coreStart, pluginsStart as MlDependencies, mlServices];
};
