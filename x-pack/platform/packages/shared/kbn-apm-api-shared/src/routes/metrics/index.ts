/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { metricsChartsRoute } from './metrics_charts';
import { serviceMetricsNodesRoute } from './service_nodes';
import { serverlessMetricsChartsRoute } from './serverless_charts';
import { serverlessActiveInstancesRoute } from './serverless_active_instances';
import { serverlessFunctionsOverviewRoute } from './serverless_functions_overview';
import { serverlessSummaryRoute } from './serverless_summary';

export const metricsRouteDefinitions = {
  charts: metricsChartsRoute,
  nodes: serviceMetricsNodesRoute,
  serverlessCharts: serverlessMetricsChartsRoute,
  serverlessActiveInstances: serverlessActiveInstancesRoute,
  serverlessFunctionsOverview: serverlessFunctionsOverviewRoute,
  serverlessSummary: serverlessSummaryRoute,
};

export type {
  FetchAndTransformMetrics,
  GenericMetricsChart,
  MetricsChartsResponse,
} from './metrics_charts';
export type { ServiceNodesResponse, ServiceMetricsNodesRouteResponse } from './service_nodes';
export type { ServerlessMetricsChartsResponse } from './serverless_charts';
export type {
  ActiveInstanceTimeseries,
  ActiveInstanceOverview,
  ServerlessActiveInstancesResponse,
} from './serverless_active_instances';
export type {
  ServerlessFunctionsOverviewResponse,
  ServerlessFunctionsOverviewRouteResponse,
} from './serverless_functions_overview';
export type {
  AwsLambdaArchitecture,
  AWSLambdaPriceFactor,
  ServerlessSummaryResponse,
} from './serverless_summary';
