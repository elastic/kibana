/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorChart } from '../../../../common/graphql/types';
import { UMElasticsearchQueryFn } from '../framework';
import {
  MonitorDetails,
  MonitorLocations,
  OverviewFilters,
} from '../../../../common/runtime_types';

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
  /** @param dateRangeStart timestamp bounds */
  dateRangeStart: string;
  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;
  /** @member search this value should correspond to Elasticsearch DSL
   *  generated from KQL text the user provided.
   */
  search?: Record<string, any>;
  filterOptions: Record<string, string[] | number[]>;
}

export interface GetMonitorDetailsParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
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

  /**
   * Fetch options for the filter bar.
   */
  getFilterBar: UMElasticsearchQueryFn<GetFilterBarParams, OverviewFilters>;

  getMonitorDetails: UMElasticsearchQueryFn<GetMonitorDetailsParams, MonitorDetails>;

  getMonitorLocations: UMElasticsearchQueryFn<GetMonitorLocationsParams, MonitorLocations>;
}
