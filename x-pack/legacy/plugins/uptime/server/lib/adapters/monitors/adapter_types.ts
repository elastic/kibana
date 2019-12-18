/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorChart, MonitorPageTitle } from '../../../../common/graphql/types';
import { UMElasticsearchQueryFn } from '../framework';
import { MonitorDetails, MonitorLocations } from '../../../../common/runtime_types';

export interface GetMonitorChartsDataParams {
  /** @member monitorId ID value for the selected monitor */
  monitorId: string;
  /** @member dateRangeStart timestamp bounds */
  dateRangeStart: string;
  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;
  /** @member location optional location value for use in filtering*/
  location?: string | null;
}

export interface GetFilterBarParams {
  dateRangeStart: string;
  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;
}

export interface GetMonitorDetailsParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
  location?: string;
}

export interface GetMonitorPageTitleParams {
  /** @member monitorId the ID to query */
  monitorId: string;
}

/**
 * Fetch data for the monitor page title.
 */
export interface GetMonitorLocationsParams {
  /**
   * @member monitorId the ID to query
   */
  monitorId: string;
  dateStart: string;
  dateEnd: string;
}

export interface UMMonitorsAdapter {
  /**
   * Fetches data used to populate monitor charts
   */
  getMonitorChartsData: UMElasticsearchQueryFn<GetMonitorChartsDataParams, MonitorChart>;
  getFilterBar: UMElasticsearchQueryFn<GetFilterBarParams, any>;
  /**
   * Fetch data for the monitor page title.
   */
  getMonitorPageTitle: UMElasticsearchQueryFn<{ monitorId: string }, MonitorPageTitle | null>;
  getMonitorDetails: UMElasticsearchQueryFn<GetMonitorDetailsParams, MonitorDetails>;
  getMonitorLocations: UMElasticsearchQueryFn<GetMonitorLocationsParams, MonitorLocations>;
}
