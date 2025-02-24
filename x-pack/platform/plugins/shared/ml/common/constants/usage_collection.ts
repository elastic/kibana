/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ML_USAGE_EVENT = {
  IMPORTED_ANOMALY_DETECTOR_JOBS: 'imported_anomaly_detector_jobs',
  IMPORT_FAILED_ANOMALY_DETECTOR_JOBS: 'import_failed_anomaly_detector_jobs',
  IMPORTED_DATA_FRAME_ANALYTICS_JOBS: 'imported_data_frame_analytics_jobs',
  IMPORT_FAILED_DATA_FRAME_ANALYTICS_JOBS: 'import_failed_data_frame_analytics_jobs',
  EXPORTED_ANOMALY_DETECTOR_JOBS: 'exported_anomaly_detector_jobs',
  EXPORTED_DATA_FRAME_ANALYTICS_JOBS: 'exported_data_frame_analytics_jobs',
} as const;

export type MlUsageEvent = (typeof ML_USAGE_EVENT)[keyof typeof ML_USAGE_EVENT];
