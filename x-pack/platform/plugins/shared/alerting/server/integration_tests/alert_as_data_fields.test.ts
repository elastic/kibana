/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { setupTestServers } from './lib';
import type { RuleTypeRegistry } from '../rule_type_registry';

jest.mock('../rule_type_registry', () => {
  const actual = jest.requireActual('../rule_type_registry');
  return {
    ...actual,
    RuleTypeRegistry: jest.fn().mockImplementation((opts) => {
      return new actual.RuleTypeRegistry(opts);
    }),
  };
});

const ruleTypes: string[] = [
  'transform_health',
  '.index-threshold',
  '.geo-containment',
  '.es-query',
  'xpack.ml.anomaly_detection_alert',
  'xpack.ml.anomaly_detection_jobs_health',
  'slo.rules.burnRate',
  'observability.rules.custom_threshold',
  'xpack.uptime.alerts.monitorStatus',
  'xpack.uptime.alerts.tlsCertificate',
  'xpack.uptime.alerts.durationAnomaly',
  'xpack.uptime.alerts.tls',
  'xpack.synthetics.alerts.monitorStatus',
  'xpack.synthetics.alerts.tls',
  'logs.alert.document.count',
  'metrics.alert.inventory.threshold',
  'metrics.alert.threshold',
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
  'apm.transaction_duration',
  'apm.anomaly',
  'apm.error_rate',
  'apm.transaction_error_rate',
  'siem.eqlRule',
  'siem.esqlRule',
  'siem.savedQueryRule',
  'siem.indicatorRule',
  'siem.mlRule',
  'siem.queryRule',
  'siem.thresholdRule',
  'siem.newTermsRule',
  'siem.notifications',
];

describe('Alert as data fields checks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let ruleTypeRegistry: RuleTypeRegistry;

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    const mockedRuleTypeRegistry = jest.requireMock('../rule_type_registry');
    expect(mockedRuleTypeRegistry.RuleTypeRegistry).toHaveBeenCalledTimes(1);
    ruleTypeRegistry = mockedRuleTypeRegistry.RuleTypeRegistry.mock.results[0].value;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  /**
   * This test is necessary to ensure the array is up to date so we can run tests
   * on all the rule types.
   */
  test('ensure rule types list up to date', async () => {
    expect(ruleTypes.sort()).toEqual(ruleTypeRegistry.getAllTypes().sort());
  });

  for (const ruleTypeId of ruleTypes) {
    test(`detect AAD fields changes for: ${ruleTypeId}`, async () => {
      const ruleType = ruleTypeRegistry.get(ruleTypeId);
      expect(ruleType.alerts?.mappings).toMatchSnapshot();
    });
  }
});
