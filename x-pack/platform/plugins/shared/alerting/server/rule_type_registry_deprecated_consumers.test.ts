/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRuleTypeIdValidLegacyConsumers,
  ruleTypeIdWithValidLegacyConsumers,
} from './rule_type_registry_deprecated_consumers';

describe('rule_type_registry_deprecated_consumers', () => {
  describe('ruleTypeIdWithValidLegacyConsumers', () => {
    test('Only these rule type ids should be in the list', () => {
      expect(Object.keys(ruleTypeIdWithValidLegacyConsumers)).toMatchInlineSnapshot(`
        Array [
          "example.always-firing",
          "example.people-in-space",
          "transform_health",
          ".index-threshold",
          ".geo-containment",
          ".es-query",
          "xpack.ml.anomaly_detection_alert",
          "xpack.ml.anomaly_detection_jobs_health",
          "xpack.synthetics.alerts.monitorStatus",
          "xpack.synthetics.alerts.tls",
          "xpack.uptime.alerts.monitorStatus",
          "xpack.uptime.alerts.tlsCertificate",
          "xpack.uptime.alerts.durationAnomaly",
          "xpack.uptime.alerts.tls",
          "siem.eqlRule",
          "siem.savedQueryRule",
          "siem.indicatorRule",
          "siem.mlRule",
          "siem.queryRule",
          "siem.thresholdRule",
          "siem.newTermsRule",
          "siem.notifications",
          "slo.rules.burnRate",
          "logs.alert.document.count",
          "metrics.alert.inventory.threshold",
          "metrics.alert.threshold",
          "monitoring_alert_cluster_health",
          "monitoring_alert_license_expiration",
          "monitoring_alert_cpu_usage",
          "monitoring_alert_missing_monitoring_data",
          "monitoring_alert_disk_usage",
          "monitoring_alert_thread_pool_search_rejections",
          "monitoring_alert_thread_pool_write_rejections",
          "monitoring_alert_jvm_memory_usage",
          "monitoring_alert_nodes_changed",
          "monitoring_alert_logstash_version_mismatch",
          "monitoring_alert_kibana_version_mismatch",
          "monitoring_alert_elasticsearch_version_mismatch",
          "monitoring_ccr_read_exceptions",
          "monitoring_shard_size",
          "apm.transaction_duration",
          "apm.anomaly",
          "apm.error_rate",
          "apm.transaction_error_rate",
          "test.always-firing",
          "test.always-firing-alert-as-data",
          "test.authorization",
          "test.cancellableRule",
          "test.cumulative-firing",
          "test.exceedsAlertLimit",
          "test.failing",
          "test.gold.noop",
          "test.longRunning",
          "test.multipleSearches",
          "test.never-firing",
          "test.noop",
          "test.onlyContextVariables",
          "test.onlyStateVariables",
          "test.patternFiring",
          "test.patternFiringAad",
          "test.patternFiringAutoRecoverFalse",
          "test.patternLongRunning",
          "test.patternLongRunning.cancelAlertsOnRuleTimeout",
          "test.patternSuccessOrFailure",
          "test.restricted-noop",
          "test.severity",
          "test.throw",
          "test.unrestricted-noop",
          "test.validation",
        ]
      `);
    });
  });
  describe('getRuleTypeIdValidLegacyConsumers', () => {
    test('".es-query" should have "alerts" & "discover" as legacy consumers', () => {
      expect(getRuleTypeIdValidLegacyConsumers('.es-query')).toEqual(['alerts', 'discover']);
    });

    test('All other rule types except ".es-query" should have "alerts" as legacy consumer', () => {
      for (const ruleTypeId of Object.keys(ruleTypeIdWithValidLegacyConsumers).filter(
        (rt) => rt !== '.es-query'
      )) {
        expect(getRuleTypeIdValidLegacyConsumers(ruleTypeId)).toEqual(['alerts']);
      }
    });
  });
});
