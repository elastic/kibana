/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ML_APP_LOCATOR = 'ML_APP_LOCATOR';

export const ML_PAGES = {
  ANOMALY_DETECTION_JOBS_MANAGE: 'jobs',
  ANOMALY_EXPLORER: 'explorer',
  SINGLE_METRIC_VIEWER: 'timeseriesexplorer',
  DATA_FRAME_ANALYTICS_JOBS_MANAGE: 'data_frame_analytics',
  DATA_FRAME_ANALYTICS_SOURCE_SELECTION: 'data_frame_analytics/source_selection',
  DATA_FRAME_ANALYTICS_CREATE_JOB: 'data_frame_analytics/new_job',
  TRAINED_MODELS_MANAGE: 'trained_models',
  DATA_DRIFT_INDEX_SELECT: 'data_drift_index_select',
  DATA_DRIFT_CUSTOM: 'data_drift_custom',
  DATA_DRIFT: 'data_drift',
  NODES: 'nodes',
  MEMORY_USAGE: 'memory_usage',
  DATA_FRAME_ANALYTICS_EXPLORATION: 'data_frame_analytics/exploration',
  DATA_FRAME_ANALYTICS_MAP: 'data_frame_analytics/map',
  SUPPLIED_CONFIGURATIONS: 'supplied_configurations',
  /**
   * Page: Data Visualizer
   */
  DATA_VISUALIZER: 'datavisualizer',
  /**
   * Page: Data Visualizer
   * Open data visualizer by selecting a Kibana data view or saved search
   */
  DATA_VISUALIZER_INDEX_SELECT: 'datavisualizer_index_select',
  /**
   * Page: Data Visualizer
   * Open data visualizer by importing data from a log file
   */
  DATA_VISUALIZER_FILE: 'filedatavisualizer',
  /**
   * Page: Data Visualizer
   * Open index data visualizer viewer page
   */
  DATA_VISUALIZER_ESQL: 'datavisualizer/esql',
  DATA_VISUALIZER_INDEX_VIEWER: 'jobs/new_job/datavisualizer',
  ANOMALY_DETECTION_CREATE_JOB: 'jobs/new_job',
  ANOMALY_DETECTION_CREATE_JOB_RECOGNIZER: 'jobs/new_job/recognize',
  ANOMALY_DETECTION_CREATE_JOB_SINGLE_METRIC: 'jobs/new_job/single_metric',
  ANOMALY_DETECTION_CREATE_JOB_MULTI_METRIC: 'jobs/new_job/multi_metric',
  ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_MULTI_METRIC: 'jobs/new_job/convert_to_multi_metric',
  ANOMALY_DETECTION_CREATE_JOB_ADVANCED: 'jobs/new_job/advanced',
  ANOMALY_DETECTION_CREATE_JOB_POPULATION: 'jobs/new_job/population',
  ANOMALY_DETECTION_CREATE_JOB_CATEGORIZATION: 'jobs/new_job/categorization',
  ANOMALY_DETECTION_CREATE_JOB_RARE: 'jobs/new_job/rare',
  ANOMALY_DETECTION_CREATE_JOB_GEO: 'jobs/new_job/geo',
  ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_ADVANCED: 'jobs/new_job/convert_to_advanced',
  ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE: 'jobs/new_job/step/job_type',
  ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX: 'jobs/new_job/step/index_or_search',
  ANOMALY_DETECTION_CREATE_JOB_FROM_LENS: 'jobs/new_job/from_lens',
  ANOMALY_DETECTION_CREATE_JOB_FROM_PATTERN_ANALYSIS: 'jobs/new_job/from_pattern_analysis',
  ANOMALY_DETECTION_CREATE_JOB_FROM_MAP: 'jobs/new_job/from_map',
  ANOMALY_DETECTION_MODULES_VIEW_OR_CREATE: 'modules/check_view_or_create',
  SETTINGS: 'settings',
  CALENDARS_MANAGE: 'settings/calendars_list',
  CALENDARS_DST_MANAGE: 'settings/calendars_dst_list',
  CALENDARS_NEW: 'settings/calendars_list/new_calendar',
  CALENDARS_DST_NEW: 'settings/calendars_dst_list/new_calendar',
  CALENDARS_EDIT: 'settings/calendars_list/edit_calendar',
  CALENDARS_DST_EDIT: 'settings/calendars_dst_list/edit_calendar',
  FILTER_LISTS_MANAGE: 'settings/filter_lists',
  FILTER_LISTS_NEW: 'settings/filter_lists/new_filter_list',
  FILTER_LISTS_EDIT: 'settings/filter_lists/edit_filter_list',
  OVERVIEW: 'overview',
  NOTIFICATIONS: 'notifications',
  AIOPS: 'aiops',
  /**
   * @deprecated since 8.10, kept here to redirect old bookmarks.
   */
  AIOPS_EXPLAIN_LOG_RATE_SPIKES: 'aiops/explain_log_rate_spikes',
  /**
   * @deprecated since 8.10, kept here to redirect old bookmarks.
   */
  AIOPS_EXPLAIN_LOG_RATE_SPIKES_INDEX_SELECT: 'aiops/explain_log_rate_spikes_index_select',
  AIOPS_LOG_RATE_ANALYSIS: 'aiops/log_rate_analysis',
  AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT: 'aiops/log_rate_analysis_index_select',
  AIOPS_LOG_CATEGORIZATION: 'aiops/log_categorization',
  AIOPS_LOG_CATEGORIZATION_INDEX_SELECT: 'aiops/log_categorization_index_select',
  AIOPS_CHANGE_POINT_DETECTION: 'aiops/change_point_detection',
  AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT: 'aiops/change_point_detection_index_select',
} as const;

export type MlPages = (typeof ML_PAGES)[keyof typeof ML_PAGES];
