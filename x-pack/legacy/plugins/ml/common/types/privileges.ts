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
  // Data Frames
  canGetDataFrameJobs: boolean;
  canDeleteDataFrameJob: boolean;
  canPreviewDataFrameJob: boolean;
  canCreateDataFrameJob: boolean;
  canStartStopDataFrameJob: boolean;
}

export function getDefaultPrivileges(enabled: boolean = false): Privileges {
  return {
    // Anomaly Detection
    canGetJobs: enabled,
    canCreateJob: enabled,
    canDeleteJob: enabled,
    canOpenJob: enabled,
    canCloseJob: enabled,
    canForecastJob: enabled,
    canGetDatafeeds: enabled,
    canStartStopDatafeed: enabled,
    canUpdateJob: enabled,
    canUpdateDatafeed: enabled,
    canPreviewDatafeed: enabled,
    // Calendars
    canGetCalendars: enabled,
    canCreateCalendar: enabled,
    canDeleteCalendar: enabled,
    // Filters
    canGetFilters: enabled,
    canCreateFilter: enabled,
    canDeleteFilter: enabled,
    // File Data Visualizer
    canFindFileStructure: enabled,
    // Data Frames
    canGetDataFrameJobs: enabled,
    canDeleteDataFrameJob: enabled,
    canPreviewDataFrameJob: enabled,
    canCreateDataFrameJob: enabled,
    canStartStopDataFrameJob: enabled,
  };
}
