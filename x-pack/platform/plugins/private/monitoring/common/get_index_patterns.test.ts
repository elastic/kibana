/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DS_INDEX_PATTERN_TYPES } from './constants';
import { MonitoringConfig } from '../server';
import {
  getElasticsearchDataset,
  getKibanaDataset,
  getLogstashDataset,
  getIndexPatterns,
} from './get_index_patterns';

const getConfigWithCcs = (ccsEnabled: boolean) => {
  return {
    ui: {
      ccs: {
        enabled: ccsEnabled,
      },
      logs: {
        index: 'filebeat-*',
      },
    },
  } as MonitoringConfig;
};

type TestTuple = [DS_INDEX_PATTERN_TYPES | undefined, string];

describe('Get Index Patterns', () => {
  describe('getIndexPatterns', () => {
    beforeEach(() => {
      jest.resetModules();
    });
    it.each<TestTuple>([
      [undefined, '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.*-*'],
      ['metrics', '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.*-*'],
      ['logs', 'filebeat-*,logs-elasticsearch.*-*'],
    ])(
      'returns local elasticsearch index patterns  when ccs is enabled (default true) and no ccs payload and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(true),
          moduleType: 'elasticsearch',
        });
        expect(indexPatterns).toBe(expected);
      }
    );
    it.each<TestTuple>([
      [undefined, '.monitoring-es-8-*,metrics-elasticsearch.stack_monitoring.*-*'],
      ['metrics', '.monitoring-es-8-*,metrics-elasticsearch.stack_monitoring.*-*'],
      ['logs', 'filebeat-*,logs-elasticsearch.*-*'],
    ])(
      'returns ecs only elasticsearch index patterns when specifying ecsLegacyOnly: true and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(true),
          moduleType: 'elasticsearch',
          ecsLegacyOnly: true,
        });
        expect(indexPatterns).toBe(expected);
      }
    );
    it.each<TestTuple>([
      [undefined, '.monitoring-kibana-*,metrics-kibana.stack_monitoring.*-*'],
      ['metrics', '.monitoring-kibana-*,metrics-kibana.stack_monitoring.*-*'],
      ['logs', 'filebeat-*,logs-kibana.*-*'],
    ])(
      'returns local kibana index patterns when ccs is enabled with no ccs payload and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(true),
          moduleType: 'kibana',
        });
        expect(indexPatterns).toBe(expected);
      }
    );
    it.each<TestTuple>([
      [undefined, '.monitoring-logstash-*,metrics-logstash.stack_monitoring.*-*'],
      ['metrics', '.monitoring-logstash-*,metrics-logstash.stack_monitoring.*-*'],
      ['logs', 'filebeat-*,logs-logstash.*-*'],
    ])(
      'returns logstash index patterns when ccs is enabled and no ccs payload and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(true),
          moduleType: 'logstash',
        });
        expect(indexPatterns).toBe(expected);
      }
    );
    it.each<TestTuple>([
      [undefined, '.monitoring-beats-*,metrics-beats.stack_monitoring.*-*'],
      ['metrics', '.monitoring-beats-*,metrics-beats.stack_monitoring.*-*'],
      ['logs', 'filebeat-*,logs-beats.*-*'],
    ])(
      'returns beats index patterns when ccs is enabled and no ccs payload and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(true),
          moduleType: 'beats',
        });
        expect(indexPatterns).toBe(expected);
      }
    );
    it.each<TestTuple>([
      [undefined, '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*'],
      ['metrics', '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*'],
      ['logs', 'filebeat-*,logs-elasticsearch.cluster_stats-*'],
    ])('returns elasticsearch index patterns with dataset and type %s', (type, expected) => {
      const indexPatterns = getIndexPatterns({
        type,
        config: getConfigWithCcs(true),
        moduleType: 'elasticsearch',
        dataset: 'cluster_stats',
      });
      expect(indexPatterns).toBe(expected);
    });
    it.each<TestTuple>([
      [undefined, '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.*-*'],
      ['metrics', '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.*-*'],
      ['logs', 'filebeat-*,logs-elasticsearch.*-*'],
    ])(
      'returns elasticsearch index patterns without ccs prefixes when ccs is disabled and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(false),
          moduleType: 'elasticsearch',
        });
        expect(indexPatterns).toBe(expected);
      }
    );
    it.each<TestTuple>([
      [undefined, '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.*-*'],
      ['metrics', '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.*-*'],
      ['logs', 'filebeat-*,logs-elasticsearch.*-*'],
    ])(
      'returns elasticsearch index patterns without ccs prefixes when ccs is disabled but ccs request payload has a value and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(false),
          ccs: 'myccs',
          moduleType: 'elasticsearch',
        });
        expect(indexPatterns).toBe(expected);
      }
    );
    it.each<TestTuple>([
      [undefined, 'myccs:.monitoring-es-*,myccs:metrics-elasticsearch.stack_monitoring.*-*'],
      ['metrics', 'myccs:.monitoring-es-*,myccs:metrics-elasticsearch.stack_monitoring.*-*'],
      ['logs', 'myccs:filebeat-*,myccs:logs-elasticsearch.*-*'],
    ])(
      'returns elasticsearch index patterns with custom ccs prefixes when ccs is enabled and ccs request payload has a value and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(true),
          ccs: 'myccs',
          moduleType: 'elasticsearch',
        });
        expect(indexPatterns).toBe(expected);
      }
    );
    it.each<TestTuple>([
      [
        undefined,
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.stack_monitoring.*-*,metrics-elasticsearch.stack_monitoring.*-*',
      ],
      [
        'metrics',
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.stack_monitoring.*-*,metrics-elasticsearch.stack_monitoring.*-*',
      ],
      ['logs', '*:filebeat-*,filebeat-*,*:logs-elasticsearch.*-*,logs-elasticsearch.*-*'],
    ])(
      'returns elasticsearch index patterns with ccs prefixes and local index patterns when ccs is enabled and ccs request payload value is * and type %s',
      (type, expected) => {
        const indexPatterns = getIndexPatterns({
          type,
          config: getConfigWithCcs(true),
          ccs: '*',
          moduleType: 'elasticsearch',
        });
        expect(indexPatterns).toBe(expected);
      }
    );

    it('returns logs-* index patterns without dataset and namespace', () => {
      const indexPatterns = getIndexPatterns({
        type: 'logs',
        config: getConfigWithCcs(false),
      });
      expect(indexPatterns).toBe('filebeat-*,logs-*.*-*');
    });
  });

  describe('getElasticsearchDataset', () => {
    it('returns elasticsearch metrics dataset', () => {
      const indexPatterns = getElasticsearchDataset('cluster_stats');
      expect(indexPatterns).toBe('elasticsearch.stack_monitoring.cluster_stats');
    });
  });

  describe('getKibanaDataset', () => {
    it('returns kibana metrics dataset', () => {
      const indexPatterns = getKibanaDataset('stats');
      expect(indexPatterns).toBe('kibana.stack_monitoring.stats');
    });
  });

  describe('getLogstashDataset', () => {
    it('returns logstash metrics dataset', () => {
      const indexPatterns = getLogstashDataset('node_stats');
      expect(indexPatterns).toBe('logstash.stack_monitoring.node_stats');
    });
  });
});
