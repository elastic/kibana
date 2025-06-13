/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @deprecated since 9.1, kept here to redirect old bookmarks
 */
export const DEPRECATED_ML_ROUTE_TO_NEW_ROUTE = {
  jobs: 'anomaly_detection',
  data_frame_analytics: 'analytics',
  trained_models: 'trained_models',
  notifications: 'overview?_g=(tab:notifications)&',
  memory_usage: 'overview',
  supplied_configurations: 'anomaly_detection/ad_supplied_configurations',
  settings: 'ad_settings',
  'settings/calendars_list': 'ad_settings/calendars_list',
  'settings/calendars_list/new_calendar': 'ad_settings/calendars_list/new_calendar',
  'settings/calendars_dst_list': 'ad_settings/calendars_dst_list',
  'settings/calendars_dst_list/new_calendar': 'ad_settings/calendars_dst_list/new_calendar',
  'settings/filter_lists': 'ad_settings/filter_lists',
  'settings/filter_lists/new_filter_list': 'ad_settings/filter_lists/new_filter_list',
  nodes: 'overview',
  'jobs/new_job/step/index_or_search': 'anomaly_detection/jobs/new_job/step/select_source',
};
