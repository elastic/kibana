/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEGRADED_DOCS_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  OBSERVABILITY_RULE_TYPE_IDS,
  STREAMS_RULE_TYPE_IDS,
} from '@kbn/rule-data-utils';

/**
 * Comprehensive fallback list of non-SIEM rule type IDs used when the user has
 * alert-read but not rule-read (e.g. stackAlertsOnly). In that case the rule
 * types API returns nothing, leaving ruleTypeIds empty and disabling the table
 * query entirely. Passing this list lets the query run; server-side RAC RBAC
 * still enforces what the user can actually see. Mirrors the pattern used by
 * the Observability alerts page (OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_…).
 *
 * Does not include SIEM rule types (e.g. 'attack-discovery') — mixing SIEM and
 * non-SIEM rule type IDs in one request throws a 400 "mixed authorization" error.
 */
export const ALL_NON_SIEM_RULE_TYPE_IDS: string[] = [
  // Observability
  ...OBSERVABILITY_RULE_TYPE_IDS,
  // Streams (not included in OBSERVABILITY_RULE_TYPE_IDS)
  ...STREAMS_RULE_TYPE_IDS,
  // Stack
  '.index-threshold',
  '.geo-containment',
  ES_QUERY_ID,
  'transform_health',
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  'xpack.ml.anomaly_detection_jobs_health',
  DEGRADED_DOCS_RULE_TYPE_ID,
  // Stack Monitoring
  'monitoring_alert_cluster_health',
  'monitoring_alert_license_expiration',
  'monitoring_alert_cpu_usage',
  'monitoring_alert_missing_monitoring_data',
  'monitoring_alert_disk_usage',
  'monitoring_alert_thread_pool_search_rejections',
  'monitoring_alert_thread_pool_write_rejections',
  'monitoring_alert_jvm_memory_usage',
  'monitoring_alert_nodes_changed',
  'monitoring_alert_logstash_version_mismatch',
  'monitoring_alert_kibana_version_mismatch',
  'monitoring_alert_elasticsearch_version_mismatch',
  'monitoring_ccr_read_exceptions',
  'monitoring_shard_size',
];
