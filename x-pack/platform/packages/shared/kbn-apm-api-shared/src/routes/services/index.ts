/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { servicesListRoute } from './services_list';
import { servicesDetailedStatisticsRoute } from './services_detailed_statistics';
import { serviceMetadataDetailsRoute } from './service_metadata_details';
import { serviceMetadataIconsRoute } from './service_metadata_icons';
import { serviceAgentRoute } from './service_agent';
import { serviceTransactionTypesRoute } from './service_transaction_types';
import { serviceNodeMetadataRoute } from './service_node_metadata';
import { serviceAnnotationsSearchRoute } from './service_annotations_search';
import { serviceThroughputRoute } from './service_throughput';
import { serviceInstancesMainStatisticsRoute } from './service_instances_main_statistics';
import { serviceInstancesDetailedStatisticsRoute } from './service_instances_detailed_statistics';
import { serviceInstancesMetadataDetailsRoute } from './service_instances_metadata_details';
import { serviceDependenciesRoute } from './service_dependencies';
import { serviceDependenciesBreakdownRoute } from './service_dependencies_breakdown';
import { serviceAnomalyChartsRoute } from './service_anomaly_charts';
import { serviceAlertsCountRoute } from './service_alerts_count';
import { serviceSlosRoute } from './service_slos';
import { serviceMixedIngestionRoute } from './service_mixed_ingestion';
import { serviceAnomalyScoreRoute } from './service_anomaly_score';

export const servicesRouteDefinitions = {
  servicesList: servicesListRoute,
  detailedStatistics: servicesDetailedStatisticsRoute,
  metadataDetails: serviceMetadataDetailsRoute,
  metadataIcons: serviceMetadataIconsRoute,
  agent: serviceAgentRoute,
  transactionTypes: serviceTransactionTypesRoute,
  nodeMetadata: serviceNodeMetadataRoute,
  annotationsSearch: serviceAnnotationsSearchRoute,
  throughput: serviceThroughputRoute,
  instancesMainStatistics: serviceInstancesMainStatisticsRoute,
  instancesDetailedStatistics: serviceInstancesDetailedStatisticsRoute,
  instancesMetadataDetails: serviceInstancesMetadataDetailsRoute,
  dependencies: serviceDependenciesRoute,
  dependenciesBreakdown: serviceDependenciesBreakdownRoute,
  anomalyCharts: serviceAnomalyChartsRoute,
  alertsCount: serviceAlertsCountRoute,
  slos: serviceSlosRoute,
  mixedIngestion: serviceMixedIngestionRoute,
  anomalyScore: serviceAnomalyScoreRoute,
};

export type { ServicesItemsResponse, MergedServiceStat } from './services_list';
export type {
  ServiceTransactionDetailedStat,
  ServiceTransactionDetailedStatPeriodsResponse,
} from './services_detailed_statistics';
export type { ServiceMetadataDetails } from './service_metadata_details';
export type { ServiceMetadataIcons } from './service_metadata_icons';
export type { ServiceAgentResponse } from './service_agent';
export type { ServiceTransactionTypesResponse } from './service_transaction_types';
export type { ServiceNodeMetadataResponse } from './service_node_metadata';
export type { ServiceAnnotationResponse } from './service_annotations_search';
export type {
  ServiceThroughputResponse,
  ServiceThroughputRouteResponse,
} from './service_throughput';
export type {
  ServiceInstanceMainStatisticsResponse,
  ServiceInstancesMainStatisticsRouteResponse,
} from './service_instances_main_statistics';
export type {
  ServiceInstancesDetailedStat,
  ServiceInstancesDetailedStatisticsResponse,
} from './service_instances_detailed_statistics';
export type {
  ServiceInstanceMetadataDetailsResponse,
  ServiceInstanceContainerMetadataDetails,
  ServiceInstancesMetadataDetailsRouteResponse,
} from './service_instances_metadata_details';
export type {
  ServiceDependenciesResponse,
  ServiceDependenciesRouteResponse,
} from './service_dependencies';
export type {
  ServiceDependenciesBreakdownResponse,
  ServiceDependenciesBreakdownRouteResponse,
} from './service_dependencies_breakdown';
export type { ServiceAnomalyChartsResponse } from './service_anomaly_charts';
export type {
  ServiceAlertsResponse,
  ServiceAlertsCountRouteResponse,
} from './service_alerts_count';
export type { ServiceSlosResponse, StatusCounts } from './service_slos';
export type { ServiceMixedIngestionResponse } from './service_mixed_ingestion';
export type { ServiceAnomalyScoreResponse } from './service_anomaly_score';
