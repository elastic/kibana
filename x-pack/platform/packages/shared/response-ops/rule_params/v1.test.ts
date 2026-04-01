/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ruleParamsSchemaWithRuleTypeId,
  ruleParamsSchema,
  ruleParamsSchemaWithDefaultValue,
  ruleParamsSchemaForUpdate,
  RULE_TYPE_ID,
} from './v1';

describe('rule params schemas', () => {
  describe('ruleParamsSchemaWithRuleTypeId', () => {
    it('validates correctly for key rule_type_id', () => {
      expect(() =>
        ruleParamsSchemaWithRuleTypeId().validate({
          [RULE_TYPE_ID]: '.es-query',
          searchType: 'searchSource',
          searchConfiguration: {},
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).not.toThrow();
    });

    it('throws when no key is provided', () => {
      expect(() =>
        ruleParamsSchemaWithRuleTypeId().validate({
          searchType: 'searchSource',
        })
      ).toThrowError(`"rule_type_id" property is required`);
    });

    it('throws when rule_type_id is unknown', () => {
      expect(() =>
        ruleParamsSchemaWithRuleTypeId().validate({ [RULE_TYPE_ID]: 'unknown' })
      ).toThrowError(
        `expected \"rule_type_id\" to be one of [\"monitoring_ccr_read_exceptions\", \"monitoring_alert_cluster_health\", \"monitoring_alert_cpu_usage\", \"monitoring_alert_disk_usage\", \"monitoring_alert_elasticsearch_version_mismatch\", \"monitoring_alert_kibana_version_mismatch\", \"monitoring_alert_license_expiration\", \"monitoring_alert_logstash_version_mismatch\", \"monitoring_alert_jvm_memory_usage\", \"monitoring_alert_missing_monitoring_data\", \"monitoring_alert_nodes_changed\", \"monitoring_shard_size\", \"monitoring_alert_thread_pool_search_rejections\", \"monitoring_alert_thread_pool_write_rejections\", \"xpack.ml.anomaly_detection_alert\", \"xpack.ml.anomaly_detection_jobs_health\", \"datasetQuality.degradedDocs\", \".es-query\", \".index-threshold\", \".geo-containment\", \"transform_health\", \"apm.anomaly\", \"apm.error_rate\", \"apm.transaction_error_rate\", \"apm.transaction_duration\", \"xpack.synthetics.alerts.monitorStatus\", \"xpack.synthetics.alerts.tls\", \"xpack.uptime.alerts.monitorStatus\", \"xpack.uptime.alerts.tlsCertificate\", \"xpack.uptime.alerts.durationAnomaly\", \"metrics.alert.inventory.threshold\", \"metrics.alert.threshold\", \"observability.rules.custom_threshold\", \"logs.alert.document.count\", \"slo.rules.burnRate\"] but got [\"unknown\"]`
      );
    });

    it('throws when params missing required fields', () => {
      const payload = {
        [RULE_TYPE_ID]: '.es-query',
        searchType: 'searchSource',
        searchConfiguration: {},
        threshold: [0],
        thresholdComparator: '>',
        size: 100,
        timeWindowUnit: 'm',
      };

      expect(() => ruleParamsSchemaWithRuleTypeId().validate(payload)).toThrowError(
        `[timeWindowSize]: expected value of type [number] but got [undefined]`
      );
    });

    it('throws error when invalid params', () => {
      const payload = {
        [RULE_TYPE_ID]: '.es-query',
        searchType: 'searchSource',
        searchConfiguration: {},
        threshold: [0],
        thresholdComparator: '>',
        size: 100,
        timeWindowUnit: 'm',
        timeWindowSize: 5,
        foo: 'bar',
      };

      expect(() => ruleParamsSchemaWithRuleTypeId().validate(payload)).toThrowError(
        `[foo]: Additional properties are not allowed ('foo' was unexpected)`
      );
    });

    it('rejects params that are valid for a different rule type', () => {
      // .es-query params (non-ObjectType: nested under params key) provided for
      // .index-threshold (ObjectType: expects flat params including required index and timeField)
      expect(() =>
        ruleParamsSchemaWithRuleTypeId().validate({
          [RULE_TYPE_ID]: '.index-threshold',
          params: {
            searchType: 'searchSource',
            threshold: [0],
            thresholdComparator: '>',
            size: 100,
            timeWindowUnit: 'm',
            timeWindowSize: 5,
          },
        })
      ).toThrowError(`[index]: expected at least one defined value but got [undefined]`);
    });
  });

  describe('ruleParamsSchemaForUpdate', () => {
    it('validates schema correctly', () => {
      expect(() =>
        ruleParamsSchemaForUpdate.validate({
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).not.toThrow();
    });

    it('rejects an object that does not match any of the allowed update schemas', () => {
      expect(() =>
        ruleParamsSchemaForUpdate.validate({
          foo: 'bar',
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).toThrow();
    });
  });

  describe('ruleParamsSchema', () => {
    it('validates schema correctly', () => {
      expect(() =>
        ruleParamsSchema.validate({
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).not.toThrow();
    });
  });

  describe('ruleParamsSchemaWithDefaultValue', () => {
    it('accepts an empty object as the default value', () => {
      expect(() => ruleParamsSchemaWithDefaultValue.validate({})).not.toThrow();
    });

    it('validates correctly with valid params', () => {
      expect(() =>
        ruleParamsSchemaWithDefaultValue.validate({
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).not.toThrow();
    });
  });
});
