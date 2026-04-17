/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils/constants';

// Hardcoded to avoid a runtime dependency on @kbn/rule-data-utils. A compile-time
// `satisfies` check in `ml/server/lib/alerts/register_anomaly_detection_alert_type.ts`
// ensures this stays in sync with `ML_ANOMALY_DETECTION_RULE_TYPE_ID`.
export const ML_ALERT_TYPES = {
  ANOMALY_DETECTION: 'xpack.ml.anomaly_detection_alert',
  AD_JOBS_HEALTH: 'xpack.ml.anomaly_detection_jobs_health',
} as const;

export const ML_RULE_TYPE_IDS = Object.values(ML_ALERT_TYPES);

export type MlAlertType = (typeof ML_ALERT_TYPES)[keyof typeof ML_ALERT_TYPES];

export const ALERT_PREVIEW_SAMPLE_SIZE = 5;

export const TOP_N_BUCKETS_COUNT = 1;

export const ALL_JOBS_SELECTION = '*';

const ML_ALERT_NAMESPACE = 'kibana.alert';

export const ALERT_ANOMALY_TIMESTAMP = `${ML_ALERT_NAMESPACE}.anomaly_timestamp` as const;
export const ALERT_ANOMALY_DETECTION_JOB_ID = `${ML_ALERT_NAMESPACE}.job_id` as const;
export const ALERT_ANOMALY_SCORE = `${ML_ALERT_NAMESPACE}.anomaly_score` as const;
export const ALERT_ANOMALY_IS_INTERIM = `${ML_ALERT_NAMESPACE}.is_interim` as const;
export const ALERT_TOP_RECORDS = `${ML_ALERT_NAMESPACE}.top_records` as const;
export const ALERT_TOP_INFLUENCERS = `${ML_ALERT_NAMESPACE}.top_influencers` as const;

export const ANOMALY_RESULT_TYPE_SCORE_FIELDS = {
  [ML_ANOMALY_RESULT_TYPE.BUCKET]: 'anomaly_score',
  [ML_ANOMALY_RESULT_TYPE.RECORD]: 'record_score',
  [ML_ANOMALY_RESULT_TYPE.INFLUENCER]: 'influencer_score',
} as const;

export const ALERT_MML_RESULTS = `${ML_ALERT_NAMESPACE}.mml_results` as const;
export const ALERT_DATAFEED_RESULTS = `${ML_ALERT_NAMESPACE}.datafeed_results` as const;
export const ALERT_DELAYED_DATA_RESULTS = `${ML_ALERT_NAMESPACE}.delayed_data_results` as const;
export const ALERT_JOB_ERRORS_RESULTS = `${ML_ALERT_NAMESPACE}.job_errors_results` as const;
