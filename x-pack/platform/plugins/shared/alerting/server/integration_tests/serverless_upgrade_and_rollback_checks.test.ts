/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { uniq } from 'lodash';
import { z, setLazySchemaDisabled } from '@kbn/zod/v4';
import { zodToJsonSchema } from 'zod-to-json-schema';
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

/**
 * These rule types are manually updated.
 *
 * TODO: We should spin up three serverless projects and pull the rule types
 * directly from them to ensure the list below remains up to date. We will still
 * need a copied list of rule types here because they are needed to write
 * test scenarios below.
 */
const ruleTypesInEsProjects: string[] = [
  '.index-threshold',
  '.geo-containment',
  '.es-query',
  'transform_health',
];
const ruleTypesInObltProjects: string[] = [
  '.index-threshold',
  '.geo-containment',
  '.es-query',
  'transform_health',
  'xpack.ml.anomaly_detection_alert',
  'xpack.ml.anomaly_detection_jobs_health',
  'slo.rules.burnRate',
  'observability.rules.custom_threshold',
  'metrics.alert.inventory.threshold',
  'apm.error_rate',
  'apm.transaction_error_rate',
  'apm.transaction_duration',
  'apm.anomaly',
  'datasetQuality.degradedDocs',
  'xpack.ml.anomaly_detection_jobs_health',
];
const ruleTypesInSecurityProjects: string[] = [
  '.index-threshold',
  '.geo-containment',
  '.es-query',
  'transform_health',
  'xpack.ml.anomaly_detection_alert',
  'xpack.ml.anomaly_detection_jobs_health',
  'siem.notifications',
  'siem.eqlRule',
  'siem.indicatorRule',
  'siem.mlRule',
  'siem.queryRule',
  'siem.savedQueryRule',
  'siem.thresholdRule',
  'siem.newTermsRule',
  'attack-discovery',
  'siem.esqlRule',
];
const skippedRuleTypes = [
  'logs.alert.document.count',
  'metrics.alert.threshold',
  'monitoring_alert_cluster_health',
  'monitoring_alert_cpu_usage',
  'monitoring_alert_disk_usage',
  'monitoring_alert_elasticsearch_version_mismatch',
  'monitoring_alert_jvm_memory_usage',
  'monitoring_alert_kibana_version_mismatch',
  'monitoring_alert_license_expiration',
  'monitoring_alert_logstash_version_mismatch',
  'monitoring_alert_missing_monitoring_data',
  'monitoring_alert_nodes_changed',
  'monitoring_alert_thread_pool_search_rejections',
  'monitoring_alert_thread_pool_write_rejections',
  'monitoring_ccr_read_exceptions',
  'monitoring_shard_size',
  'xpack.synthetics.alerts.monitorStatus',
  'xpack.synthetics.alerts.tls',
  'xpack.uptime.alerts.durationAnomaly',
  'xpack.uptime.alerts.monitorStatus',
  'xpack.uptime.alerts.tls',
  'xpack.uptime.alerts.tlsCertificate',
]

describe('Serverless upgrade and rollback checks', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let ruleTypeRegistry: RuleTypeRegistry;
  const ruleTypesToCheck: string[] = uniq(
    ruleTypesInEsProjects.concat(ruleTypesInObltProjects).concat(ruleTypesInSecurityProjects)
  );

  beforeAll(async () => {
    setLazySchemaDisabled(true);
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    const mockedRuleTypeRegistry = jest.requireMock('../rule_type_registry');
    expect(mockedRuleTypeRegistry.RuleTypeRegistry).toHaveBeenCalledTimes(1);
    ruleTypeRegistry = mockedRuleTypeRegistry.RuleTypeRegistry.mock.results[0].value;
  });

  afterAll(async () => {
    setLazySchemaDisabled(false);
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  // if this test fails, then a rule type in the lists above is missing
  test('ensure all rule types still exist', () => {
    const registeredRuleTypes = Array.from(ruleTypeRegistry.list().keys());
    for (const ruleTypeId of ruleTypesToCheck) {
      expect(registeredRuleTypes).toContain(ruleTypeId);
    }
  });
  
  // if this test fails, the rule type should be added to one of the lists above
  test('ensure all rule types are checked or skipped', () => {
    const registeredRuleTypes = Array.from(ruleTypeRegistry.list().keys());
    for (const ruleTypeId of registeredRuleTypes) {
      if (!ruleTypesToCheck.includes(ruleTypeId)) {
        expect(skippedRuleTypes).toContain(ruleTypeId);
      }
    }
  });

  // if this test fails, a skipped rule type has a schema and should added
  // to one of the other lists above
  test('ensure all skipped types have no schema', () => {
    const typesWithSchema: string[] = [];
    for (const ruleTypeId of skippedRuleTypes) {
      let ruleType: ReturnType<typeof ruleTypeRegistry.get>;
      try {
        ruleType = ruleTypeRegistry.get(ruleTypeId);
      } catch (e) {
        continue;
      }
      if (ruleType?.schemas?.params) {
        typesWithSchema.push(ruleTypeId);
      }
    }
    expect(typesWithSchema).toHaveLength(0); // ensure no skipped types have a schema
  });

  for (const ruleTypeId of ruleTypesToCheck) {
    test(`detect param changes to review for: ${ruleTypeId}`, async () => {
      const ruleType = ruleTypeRegistry.get(ruleTypeId);
      if (!ruleType?.schemas?.params) {
        throw new Error('schema.params is required for rule type:' + ruleTypeId);
      }
      const schemaType = ruleType.schemas.params.type;
      if (schemaType === 'config-schema') {
        expect(ruleType.schemas.params.schema.getSchema().describe()).toMatchSnapshot();
      } else if (schemaType === 'zod') {
        const schema = ruleType.schemas.params.schema;
        let jsonSchema: Record<string, unknown>;
        if (schema && typeof schema === 'object' && '_zod' in schema) {
          // Zod v4 schema
          const { $schema, ...rest } = z.toJSONSchema(schema as z.ZodType, {
            unrepresentable: 'any',
            io: 'input',
            reused: 'ref',
          }) as Record<string, unknown>;
          jsonSchema = rest;
        } else {
          // Zod v3 schema — use zod-to-json-schema
          const { $schema, ...rest } = zodToJsonSchema(schema) as Record<string, unknown>;
          jsonSchema = rest;
        }
        expect(jsonSchema).toMatchSnapshot();
      } else {
        throw new Error(`Support for ${schemaType} missing`);
      }
    });
  }
});
