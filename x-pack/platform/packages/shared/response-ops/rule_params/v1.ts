/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'node:path';
import type { Type, TypeOf, ObjectType } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { toSlugIdentifier } from '@kbn/std';
import { mlAnomalyDetectionAlertParamsSchemaV1 } from './anomaly_detection';
import { anomalyDetectionJobsHealthRuleParamsSchemaV1 } from './anomaly_detection_jobs_health';
import { anomalyParamsSchemaV1 } from './apm_anomaly';
import { ccrReadExceptionsParamsSchemaV1 } from './ccr_read_exceptions';
import { clusterHealthParamsSchemaV1 } from './cluster_health';
import { cpuUsageParamsSchemaV1 } from './cpu_usage';
import { customThresholdParamsSchemaV1 } from './custom_threshold';
import { degradedDocsParamsSchemaV1 } from './degraded_docs';
import { diskUsageParamsSchemaV1 } from './disk_usage';
import { errorCountParamsSchemaV1 } from './error_count';
import { EsQueryRuleParamsSchemaV1 } from './es_query';
import { esVersionMismatchParamsSchemaV1 } from './es_version_mismatch';
import { trackingContainmentRuleParamsSchemaV1 } from './geo_containment';
import { IndexThresholdRuleParamsSchemaV1 } from './index_threshold';
import { kibanaVersionMismatchParamsSchemaV1 } from './kibana_version_mismatch';
import { largeShardSizeParamsSchemaV1 } from './large_shard_size';
import { licenseExpirationParamsSchemaV1 } from './license_expiration';
import { logThresholdParamsSchemaV1 } from './log_threshold';
import { logstashVersionMismatchParamsSchemaV1 } from './logstash_version_mismatch';
import { memoryUsageParamsSchemaV1 } from './memory_usage';
import { metricInventoryThresholdRuleParamsSchemaV1 } from './metric_inventory_threshold';
import { metricThresholdRuleParamsSchemaV1 } from './metric_threshold';
import { missingMonitoringDataParamsSchemaV1 } from './missing_monitoring_data';
import { nodesChangedParamsSchemaV1 } from './nodes_changed';
import { sloBurnRateParamsSchemaV1 } from './slo_burn_rate';
import { syntheticsMonitorStatusRuleParamsSchemaV1 } from './synthetics_monitor_status';
import { tlsRuleParamsSchemaV1 } from './synthetics_tls';
import { threadPoolSearchRejectionsParamsSchemaV1 } from './thread_pool_search_rejections';
import { threadPoolWriteRejectionsParamsSchemaV1 } from './thread_pool_write_rejections';
import { transactionDurationParamsSchemaV1 } from './transaction_duration';
import { transactionErrorRateParamsSchemaV1 } from './transaction_error_rate';
import { transformHealthRuleParamsSchemaV1 } from './transform_health';
import { uptimeDurationAnomalyRuleParamsSchemaV1 } from './uptime_duration_anomaly';
import { uptimeMonitorStatusRuleParamsSchemaV1 } from './uptime_monitor_status';
import { uptimeTLSRuleParamsSchemaV1 } from './uptime_tls';

export const RULE_TYPE_ID = 'rule_type_id';

const ruleParamsSchemasWithRuleTypeId: Record<string, { title: string; params: Type<unknown> }> = {
  monitoring_ccr_read_exceptions: {
    title: 'CCR read exceptions',
    params: ccrReadExceptionsParamsSchemaV1,
  },
  monitoring_alert_cluster_health: { title: 'Cluster health', params: clusterHealthParamsSchemaV1 },
  monitoring_alert_cpu_usage: { title: 'CPU usage', params: cpuUsageParamsSchemaV1 },
  monitoring_alert_disk_usage: { title: 'Disk usage', params: diskUsageParamsSchemaV1 },
  monitoring_alert_elasticsearch_version_mismatch: {
    title: 'Elasticsearch version mismatch',
    params: esVersionMismatchParamsSchemaV1,
  },
  monitoring_alert_kibana_version_mismatch: {
    title: 'Kibana version mismatch',
    params: kibanaVersionMismatchParamsSchemaV1,
  },
  monitoring_alert_license_expiration: {
    title: 'License expiration',
    params: licenseExpirationParamsSchemaV1,
  },
  monitoring_alert_logstash_version_mismatch: {
    title: 'Logstash version mismatch',
    params: logstashVersionMismatchParamsSchemaV1,
  },
  monitoring_alert_jvm_memory_usage: {
    title: 'JVM memory usage',
    params: memoryUsageParamsSchemaV1,
  },
  monitoring_alert_missing_monitoring_data: {
    title: 'Missing monitoring data',
    params: missingMonitoringDataParamsSchemaV1,
  },
  monitoring_alert_nodes_changed: { title: 'Nodes changed', params: nodesChangedParamsSchemaV1 },
  monitoring_shard_size: { title: 'Large shard size', params: largeShardSizeParamsSchemaV1 },
  monitoring_alert_thread_pool_search_rejections: {
    title: 'Thread pool search rejections',
    params: threadPoolSearchRejectionsParamsSchemaV1,
  },
  monitoring_alert_thread_pool_write_rejections: {
    title: 'Thread pool write rejections',
    params: threadPoolWriteRejectionsParamsSchemaV1,
  },
  'xpack.ml.anomaly_detection_alert': {
    title: 'Anomaly detection',
    params: mlAnomalyDetectionAlertParamsSchemaV1,
  },
  'xpack.ml.anomaly_detection_jobs_health': {
    title: 'Anomaly detection jobs health',
    params: anomalyDetectionJobsHealthRuleParamsSchemaV1,
  },
  'datasetQuality.degradedDocs': { title: 'Degraded docs', params: degradedDocsParamsSchemaV1 },
  '.es-query': { title: 'ES query', params: EsQueryRuleParamsSchemaV1 },
  '.index-threshold': { title: 'Index threshold', params: IndexThresholdRuleParamsSchemaV1 },
  '.geo-containment': { title: 'Geo containment', params: trackingContainmentRuleParamsSchemaV1 },
  transform_health: { title: 'Transform health', params: transformHealthRuleParamsSchemaV1 },
  'apm.anomaly': { title: 'APM anomaly', params: anomalyParamsSchemaV1 },
  'apm.error_rate': { title: 'Error rate', params: errorCountParamsSchemaV1 },
  'apm.transaction_error_rate': {
    title: 'Transaction error rate',
    params: transactionErrorRateParamsSchemaV1,
  },
  'apm.transaction_duration': {
    title: 'Transaction duration',
    params: transactionDurationParamsSchemaV1,
  },
  'xpack.synthetics.alerts.monitorStatus': {
    title: 'Synthetics monitor status',
    params: syntheticsMonitorStatusRuleParamsSchemaV1,
  },
  'xpack.synthetics.alerts.tls': { title: 'Synthetics TLS', params: tlsRuleParamsSchemaV1 },
  'xpack.uptime.alerts.monitorStatus': {
    title: 'Uptime monitor status',
    params: uptimeMonitorStatusRuleParamsSchemaV1,
  },
  'xpack.uptime.alerts.tlsCertificate': {
    title: 'Uptime TLS certificate',
    params: uptimeTLSRuleParamsSchemaV1,
  },
  'xpack.uptime.alerts.durationAnomaly': {
    title: 'Uptime duration anomaly',
    params: uptimeDurationAnomalyRuleParamsSchemaV1,
  },
  'metrics.alert.inventory.threshold': {
    title: 'Metric inventory threshold',
    params: metricInventoryThresholdRuleParamsSchemaV1,
  },
  'metrics.alert.threshold': {
    title: 'Metric threshold',
    params: metricThresholdRuleParamsSchemaV1,
  },
  'observability.rules.custom_threshold': {
    title: 'Custom threshold',
    params: customThresholdParamsSchemaV1,
  },
  'logs.alert.document.count': { title: 'Log threshold', params: logThresholdParamsSchemaV1 },
  'slo.rules.burnRate': { title: 'SLO burn rate', params: sloBurnRateParamsSchemaV1 },
};

export const ruleParamsSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()), {
  meta: { description: 'The parameters for the rule.' },
});

export const ruleParamsSchemaWithDefaultValue = schema.recordOf(
  schema.string(),
  schema.maybe(schema.any()),
  {
    defaultValue: {},
    meta: { description: 'The parameters for the rule.' },
  }
);

export const ruleParamsSchemasForCreate = (
  baseFields: Record<string, Type<unknown>>
): Array<ObjectType<any>> => {
  return Object.entries(ruleParamsSchemasWithRuleTypeId).map(([ruleTypeId, { title, params }]) => {
    return schema.object(
      {
        ...baseFields,
        rule_type_id: schema.literal(ruleTypeId),
        params,
      },
      {
        meta: {
          id: `${toSlugIdentifier(ruleTypeId)}-create-rule-body-alerting`,
          title,
        },
      }
    );
  });
};

export const ruleParamsSchemaForUpdate = ruleParamsSchemaWithDefaultValue;

export const createRuleParamsExamples = () =>
  path.join(__dirname, 'examples_create_rule_params.yaml');

export type RuleParams = TypeOf<typeof ruleParamsSchema>;
export type RuleParamsWithDefaultValue = TypeOf<typeof ruleParamsSchemaWithDefaultValue>;
export type RuleParamsForUpdate = TypeOf<typeof ruleParamsSchemaForUpdate>;
export type RuleParamsForCreate = ReturnType<typeof ruleParamsSchemasForCreate>;
