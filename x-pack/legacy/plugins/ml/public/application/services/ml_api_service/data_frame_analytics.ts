/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { http } from '../http_service';

import { basePath } from './index';
import { DataFrameAnalyticsStats } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';

export interface GetDataFrameAnalyticsStatsResponseOk {
  node_failures?: object;
  count: number;
  data_frame_analytics: DataFrameAnalyticsStats[];
}

export interface GetDataFrameAnalyticsStatsResponseError {
  statusCode: number;
  error: string;
  message: string;
}

export type GetDataFrameAnalyticsStatsResponse =
  | GetDataFrameAnalyticsStatsResponseOk
  | GetDataFrameAnalyticsStatsResponseError;

export const dataFrameAnalytics = {
  getDataFrameAnalytics(analyticsId?: string): Promise<any> {
    const analyticsIdString = analyticsId !== undefined ? `/${analyticsId}` : '';
    return http({
      path: `${basePath()}/data_frame/analytics${analyticsIdString}`,
      method: 'GET',
    });
  },
  getDataFrameAnalyticsStats(analyticsId?: string): Promise<GetDataFrameAnalyticsStatsResponse> {
    if (analyticsId !== undefined) {
      return http({
        path: `${basePath()}/data_frame/analytics/${analyticsId}/_stats`,
        method: 'GET',
      });
    }

    return http({
      path: `${basePath()}/data_frame/analytics/_stats`,
      method: 'GET',
    });
  },
  createDataFrameAnalytics(analyticsId: string, analyticsConfig: any): Promise<any> {
    const body = JSON.stringify(analyticsConfig);
    return http({
      path: `${basePath()}/data_frame/analytics/${analyticsId}`,
      method: 'PUT',
      body,
    });
  },
  evaluateDataFrameAnalytics(evaluateConfig: any): Promise<any> {
    const body = JSON.stringify(evaluateConfig);
    return http({
      path: `${basePath()}/data_frame/_evaluate`,
      method: 'POST',
      body,
    });
  },
  explainDataFrameAnalytics(jobConfig: any): Promise<any> {
    const body = JSON.stringify(jobConfig);
    return http({
      path: `${basePath()}/data_frame/analytics/_explain`,
      method: 'POST',
      body,
    });
  },
  deleteDataFrameAnalytics(analyticsId: string): Promise<any> {
    return http({
      path: `${basePath()}/data_frame/analytics/${analyticsId}`,
      method: 'DELETE',
    });
  },
  startDataFrameAnalytics(analyticsId: string): Promise<any> {
    return http({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/_start`,
      method: 'POST',
    });
  },
  stopDataFrameAnalytics(analyticsId: string, force: boolean = false): Promise<any> {
    return http({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/_stop`,
      method: 'POST',
      query: { force },
    });
  },
  getAnalyticsAuditMessages(analyticsId: string): Promise<any> {
    return http({
      path: `${basePath()}/data_frame/analytics/${analyticsId}/messages`,
      method: 'GET',
    });
  },
};
