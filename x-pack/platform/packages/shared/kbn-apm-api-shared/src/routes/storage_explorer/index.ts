/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { storageExplorerRoute } from './storage_explorer';
import { storageExplorerServiceDetailsRoute } from './storage_explorer_service_details';
import { storageChartRoute } from './storage_chart';
import { storageExplorerPrivilegesRoute } from './storage_explorer_privileges';
import { storageExplorerSummaryStatsRoute } from './storage_explorer_summary_stats';
import { storageExplorerIsCrossClusterRoute } from './storage_explorer_is_cross_cluster';
import { storageExplorerGetServicesRoute } from './storage_explorer_get_services';

export const storageExplorerRouteDefinitions = {
  storageExplorer: storageExplorerRoute,
  serviceDetails: storageExplorerServiceDetailsRoute,
  chart: storageChartRoute,
  privileges: storageExplorerPrivilegesRoute,
  summaryStats: storageExplorerSummaryStatsRoute,
  isCrossCluster: storageExplorerIsCrossClusterRoute,
  getServices: storageExplorerGetServicesRoute,
};

export type {
  StorageExplorerServiceStatisticsResponse,
  StorageExplorerRouteResponse,
} from './storage_explorer';
export type { StorageDetailsResponse } from './storage_explorer_service_details';
export type { SizeTimeseriesResponse, StorageChartRouteResponse } from './storage_chart';
export type { StorageExplorerPrivilegesResponse } from './storage_explorer_privileges';
export type { StorageExplorerSummaryStatisticsResponse } from './storage_explorer_summary_stats';
export type { StorageExplorerIsCrossClusterResponse } from './storage_explorer_is_cross_cluster';
export type { StorageExplorerGetServicesResponse } from './storage_explorer_get_services';
