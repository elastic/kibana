/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { _vertexStats, _enrichStateWithStatsAggregation } from '../get_pipeline';

describe('get_pipeline', () => {
  describe('_vertexStats function', () => {
    let vertex;
    let vertexStatsBucket;
    let totalProcessorsDurationInMillis;
    let timeseriesIntervalInSeconds;

    beforeEach(() => {
      vertex = {
        plugin_type: 'input',
      };

      vertexStatsBucket = {
        events_in_total: { value: 10000 },
        events_out_total: { value: 9000 },
        duration_in_millis_total: { value: 18000 },
        queue_push_duration_in_millis_total: { value: 100000 },
        queue_push_duration_in_millis: { value: 20000 },
      };

      totalProcessorsDurationInMillis = 24000;
      timeseriesIntervalInSeconds = 15 * 60;
    });

    it('returns correct stats', () => {
      const result = _vertexStats(
        vertex,
        vertexStatsBucket,
        totalProcessorsDurationInMillis,
        timeseriesIntervalInSeconds
      );
      expect(result).to.eql({
        events_out_per_millisecond: 0.01,
        millis_per_event: 2,
      });
    });

    describe('vertex represents filter plugin', () => {
      beforeEach(() => {
        vertex = {
          plugin_type: 'filter',
        };
      });

      it('returns correct stats', () => {
        const result = _vertexStats(
          vertex,
          vertexStatsBucket,
          totalProcessorsDurationInMillis,
          timeseriesIntervalInSeconds
        );
        expect(result).to.eql({
          events_in_per_millisecond: 0.011111111111111112,
          events_out_per_millisecond: 0.01,
          millis_per_event: 1.8,
          percent_of_total_processor_duration: 0.75,
        });
      });
    });

    describe('vertex represents output plugin', () => {
      beforeEach(() => {
        vertex = {
          plugin_type: 'output',
        };
      });

      it('returns correct stats', () => {
        const result = _vertexStats(
          vertex,
          vertexStatsBucket,
          totalProcessorsDurationInMillis,
          timeseriesIntervalInSeconds
        );
        expect(result).to.eql({
          events_in_per_millisecond: 0.011111111111111112,
          events_out_per_millisecond: 0.01,
          millis_per_event: 1.8,
          percent_of_total_processor_duration: 0.75,
        });
      });
    });
  });

  describe('_enrichStateWithStatsAggregation function', () => {
    let stateDocument;
    let statsAggregation;
    let timeseriesInterval;

    beforeEach(() => {
      stateDocument = {
        cluster_uuid: 'g31hizD1QFimSLDx_ibbeQ',
        timestamp: '2017-07-24T23:24:58.320Z',
        type: 'logstash_state',
        source_node: {
          uuid: 'B0buMd-LQMiFBxVSqqh77g',
          host: '127.0.0.1',
          transport_address: '127.0.0.1:9300',
          ip: '127.0.0.1',
          name: 'B0buMd-',
          attributes: {
            'ml.machine_memory': '17179869184',
            'ml.max_open_jobs': '20',
          },
        },
        logstash_state: {
          pipeline: {
            batch_size: 125,
            id: 'main',
            ephemeral_id: '2c53e689-62e8-4ef3-bc57-ea968531a848',
            workers: 1,
            representation: {
              type: 'lir',
              version: '0.0.0',
              hash: 'eada8baceee81726f6be9d0a071beefad3d9a2fd1b5f5d916011dca9fa66d081',
              plugins: [],
              graph: {
                vertices: [
                  {
                    config_name: 'stdin',
                    plugin_type: 'input',
                    id: 'mystdin',
                    type: 'plugin',
                  },
                  {
                    config_name: 'stdout',
                    plugin_type: 'output',
                    id: 'mystdout',
                    type: 'plugin',
                  },
                ],
                edges: [
                  {
                    from: 'mystdin',
                    to: '__QUEUE__',
                    id: 'c56369ba2e160c8add43e8f105ca17c374b27f4b4627ea4566f066b0ead0bcc7',
                    type: 'plain',
                  },
                  {
                    from: '__QUEUE__',
                    to: 'mystdout',
                    id: '8a5222282b023399a14195011f2a14aa54a4d97810cd9e0a63c5cd98856bb70f',
                    type: 'plain',
                  },
                ],
              },
            },
            hash: 'eada8baceee81726f6be9d0a071beefad3d9a2fd1b5f5d916011dca9fa66d081',
          },
        },
      };

      statsAggregation = {
        aggregations: {
          pipelines: {
            scoped: {
              vertices: {
                vertex_id: {
                  buckets: [
                    {
                      key: 'mystdout',
                      events_in_total: { value: 1000 },
                      events_out_total: { value: 1000 },
                      duration_in_millis_total: { value: 15 },
                    },
                    {
                      key: 'mystdin',
                      events_in_total: { value: 0 },
                      events_out_total: { value: 1000 },
                      duration_in_millis_total: { value: 0 },
                    },
                  ],
                },
              },
              total_processor_duration_stats: {
                count: 276,
                min: 0,
                max: 15904756,
                avg: 6591773.384057971,
                sum: 1819329454,
              },
            },
          },
        },
      };

      timeseriesInterval = 30;
    });

    it('enriches the state document correctly with stats', () => {
      const enrichedStateDocument = _enrichStateWithStatsAggregation(
        stateDocument,
        statsAggregation,
        timeseriesInterval
      );
      expect(enrichedStateDocument).to.eql({
        batch_size: 125,
        ephemeral_id: '2c53e689-62e8-4ef3-bc57-ea968531a848',
        hash: 'eada8baceee81726f6be9d0a071beefad3d9a2fd1b5f5d916011dca9fa66d081',
        id: 'main',
        representation: {
          type: 'lir',
          version: '0.0.0',
          hash: 'eada8baceee81726f6be9d0a071beefad3d9a2fd1b5f5d916011dca9fa66d081',
          graph: {
            vertices: [
              {
                config_name: 'stdin',
                id: 'mystdin',
                type: 'plugin',
                plugin_type: 'input',
                stats: {
                  events_out_per_millisecond: 0.03333333333333333,
                  millis_per_event: 0,
                },
              },
              {
                config_name: 'stdout',
                id: 'mystdout',
                type: 'plugin',
                plugin_type: 'output',
                stats: {
                  events_in_per_millisecond: 0.03333333333333333,
                  events_out_per_millisecond: 0.03333333333333333,
                  millis_per_event: 0.015,
                  percent_of_total_processor_duration: 0.0000009431141225932671,
                },
              },
            ],
            edges: [
              {
                id: 'c56369ba2e160c8add43e8f105ca17c374b27f4b4627ea4566f066b0ead0bcc7',
                from: 'mystdin',
                to: '__QUEUE__',
                type: 'plain',
              },
              {
                id: '8a5222282b023399a14195011f2a14aa54a4d97810cd9e0a63c5cd98856bb70f',
                from: '__QUEUE__',
                to: 'mystdout',
                type: 'plain',
              },
            ],
          },
          plugins: [],
        },
        workers: 1,
      });
    });
  });
});
