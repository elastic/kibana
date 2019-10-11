/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
//

export interface Privileges {
  // Anomaly Detection
  canGetJobs: boolean;
  canCreateJob: boolean;
  canDeleteJob: boolean;
  canOpenJob: boolean;
  canCloseJob: boolean;
  canForecastJob: boolean;
  canGetDatafeeds: boolean;
  canStartStopDatafeed: boolean;
  canUpdateJob: boolean;
  canUpdateDatafeed: boolean;
  canPreviewDatafeed: boolean;
  // Calendars
  canGetCalendars: boolean;
  canCreateCalendar: boolean;
  canDeleteCalendar: boolean;
  // Filters
  canGetFilters: boolean;
  canCreateFilter: boolean;
  canDeleteFilter: boolean;
  // File Data Visualizer
  canFindFileStructure: boolean;
  // Data Frame Analytics
  canGetDataFrameAnalytics: boolean;
  canDeleteDataFrameAnalytics: boolean;
  canCreateDataFrameAnalytics: boolean;
  canStartStopDataFrameAnalytics: boolean;
}

export function getDefaultPrivileges(): Privileges {
  return {
    // Anomaly Detection
    canGetJobs: false,
    canCreateJob: false,
    canDeleteJob: false,
    canOpenJob: false,
    canCloseJob: false,
    canForecastJob: false,
    canGetDatafeeds: false,
    canStartStopDatafeed: false,
    canUpdateJob: false,
    canUpdateDatafeed: false,
    canPreviewDatafeed: false,
    // Calendars
    canGetCalendars: false,
    canCreateCalendar: false,
    canDeleteCalendar: false,
    // Filters
    canGetFilters: false,
    canCreateFilter: false,
    canDeleteFilter: false,
    // File Data Visualizer
    canFindFileStructure: false,
    // Data Frame Analytics
    canGetDataFrameAnalytics: false,
    canDeleteDataFrameAnalytics: false,
    canCreateDataFrameAnalytics: false,
    canStartStopDataFrameAnalytics: false,
  };
}

export interface PrivilegesResponse {
  capabilities: Privileges;
  upgradeInProgress: boolean;
  isPlatinumOrTrialLicense: boolean;
  mlFeatureEnabledInSpace: boolean;
}
