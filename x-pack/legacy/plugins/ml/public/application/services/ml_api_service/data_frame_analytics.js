/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { http } from '../http_service';

const basePath = chrome.addBasePath('/api/ml');

export const dataFrameAnalytics = {
  getDataFrameAnalytics(analyticsId) {
    const analyticsIdString = analyticsId !== undefined ? `/${analyticsId}` : '';
    return http({
      url: `${basePath}/data_frame/analytics${analyticsIdString}`,
      method: 'GET',
    });
  },
  getDataFrameAnalyticsStats(analyticsId) {
    if (analyticsId !== undefined) {
      return http({
        url: `${basePath}/data_frame/analytics/${analyticsId}/_stats`,
        method: 'GET',
      });
    }

    return http({
      url: `${basePath}/data_frame/analytics/_stats`,
      method: 'GET',
    });
  },
  createDataFrameAnalytics(analyticsId, analyticsConfig) {
    return http({
      url: `${basePath}/data_frame/analytics/${analyticsId}`,
      method: 'PUT',
      data: analyticsConfig,
    });
  },
  evaluateDataFrameAnalytics(evaluateConfig) {
    return http({
      url: `${basePath}/data_frame/_evaluate`,
      method: 'POST',
      data: evaluateConfig,
    });
  },
  estimateDataFrameAnalyticsMemoryUsage(jobConfig) {
    return http({
      url: `${basePath}/data_frame/analytics/_explain`,
      method: 'POST',
      data: jobConfig,
    });
  },
  deleteDataFrameAnalytics(analyticsId) {
    return http({
      url: `${basePath}/data_frame/analytics/${analyticsId}`,
      method: 'DELETE',
    });
  },
  startDataFrameAnalytics(analyticsId) {
    return http({
      url: `${basePath}/data_frame/analytics/${analyticsId}/_start`,
      method: 'POST',
    });
  },
  stopDataFrameAnalytics(analyticsId, force = false) {
    return http({
      url: `${basePath}/data_frame/analytics/${analyticsId}/_stop?force=${force}`,
      method: 'POST',
    });
  },
  getAnalyticsAuditMessages(analyticsId) {
    return http({
      url: `${basePath}/data_frame/analytics/${analyticsId}/messages`,
      method: 'GET',
    });
  },
};
