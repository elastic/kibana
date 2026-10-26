/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mobileFiltersRoute } from './mobile_filters';
import { mobileMostUsedChartsRoute } from './mobile_most_used_charts';
import { mobileStatsRoute } from './mobile_stats';
import { mobileLocationStatsRoute } from './mobile_location_stats';
import { mobileSessionsRoute } from './mobile_sessions';
import { mobileHttpRequestsRoute } from './mobile_http_requests';
import { mobileTermsByFieldRoute } from './mobile_terms_by_field';
import { mobileMainStatisticsRoute } from './mobile_main_statistics';
import { mobileDetailedStatisticsRoute } from './mobile_detailed_statistics';

export const mobileRouteDefinitions = {
  filters: mobileFiltersRoute,
  mostUsedCharts: mobileMostUsedChartsRoute,
  stats: mobileStatsRoute,
  locationStats: mobileLocationStatsRoute,
  sessions: mobileSessionsRoute,
  httpRequests: mobileHttpRequestsRoute,
  termsByField: mobileTermsByFieldRoute,
  mainStatistics: mobileMainStatisticsRoute,
  detailedStatistics: mobileDetailedStatisticsRoute,
};

export type { MobileFiltersResponse, MobileFiltersRouteResponse } from './mobile_filters';
export type {
  MobileMostUsedChartResponse,
  MobileMostUsedChartsRouteResponse,
} from './mobile_most_used_charts';
export type { MobilePeriodStats } from './mobile_stats';
export type { MobileLocationStats } from './mobile_location_stats';
export type { SessionsTimeseries } from './mobile_sessions';
export type { HttpRequestsTimeseries } from './mobile_http_requests';
export type {
  MobileTermsByFieldResponse,
  MobileTermsByFieldRouteResponse,
} from './mobile_terms_by_field';
export type { MobileMainStatisticsResponse } from './mobile_main_statistics';
export type {
  MobileDetailedStatistics,
  MobileDetailedStatisticsResponse,
} from './mobile_detailed_statistics';
