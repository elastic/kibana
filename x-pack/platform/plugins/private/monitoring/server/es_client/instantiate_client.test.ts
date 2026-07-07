/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { instantiateClient, hasMonitoringCluster } from './instantiate_client';
import {
  elasticsearchServiceMock,
  type MockedElasticSearchServiceStart,
} from '@kbn/core-elasticsearch-server-mocks';
import type { MonitoringElasticsearchConfig } from '../config';
import { loggerMock } from '@kbn/logging-mocks';

const server = {
  monitoring: {
    ui: {
      elasticsearch: {
        hosts: [],
        username: 'monitoring-user-internal-test',
        password: 'monitoring-p@ssw0rd!-internal-test',
        customHeaders: {
          'x-custom-headers-test': 'connection-monitoring',
        },
      } as Partial<MonitoringElasticsearchConfig> as MonitoringElasticsearchConfig,
    },
  },
};
const serverWithUrl = {
  monitoring: {
    ui: {
      elasticsearch: {
        hosts: ['http://monitoring-cluster.test:9200'],
        username: 'monitoring-user-internal-test',
        password: 'monitoring-p@ssw0rd!-internal-test',
        customHeaders: {
          'x-custom-headers-test': 'connection-monitoring',
        },
      } as Partial<MonitoringElasticsearchConfig> as MonitoringElasticsearchConfig,
    },
  },
};

const log = loggerMock.create();

describe('Instantiate Client', () => {
  let elasticsearchStart: MockedElasticSearchServiceStart;
  beforeAll(() => {
    elasticsearchStart = elasticsearchServiceMock.createStart();
  });

  afterEach(() => {
    elasticsearchStart.createClient.mockReset();
    log.info.mockReset();
  });

  describe('Logging', () => {
    it('logs that the config was sourced from the production options', () => {
      instantiateClient(server.monitoring.ui.elasticsearch, log, elasticsearchStart);

      expect(log.info.mock.calls[0]).toEqual(['config sourced from: production cluster']);
    });

    it('logs that the config was sourced from the monitoring options', () => {
      instantiateClient(serverWithUrl.monitoring.ui.elasticsearch, log, elasticsearchStart);

      expect(log.info.mock.calls[0]).toEqual(['config sourced from: monitoring cluster']);
    });
  });

  describe('Custom Headers Configuration', () => {
    it('Does not create a new client if connected to production cluster', () => {
      instantiateClient(server.monitoring.ui.elasticsearch, log, elasticsearchStart);

      expect(elasticsearchStart.createClient).toHaveBeenCalledTimes(0);
    });

    it('Adds xpack.monitoring.elasticsearch.customHeaders if connected to monitoring cluster', () => {
      instantiateClient(serverWithUrl.monitoring.ui.elasticsearch, log, elasticsearchStart);

      const createClusterCall = elasticsearchStart.createClient.mock.calls[0];

      expect(elasticsearchStart.createClient).toHaveBeenCalledTimes(1);
      expect(createClusterCall[0]).toBe('monitoring');
      expect(createClusterCall[1]?.customHeaders).toEqual({
        'x-custom-headers-test': 'connection-monitoring',
      });
    });
  });

  describe('Use a connection to production cluster', () => {
    it('exposes an authenticated client using production host settings', () => {
      const client = instantiateClient(server.monitoring.ui.elasticsearch, log, elasticsearchStart);

      expect(elasticsearchStart.createClient).toHaveBeenCalledTimes(0);
      expect(client).toEqual(elasticsearchStart.client);
    });
  });

  describe('Use a connection to monitoring cluster', () => {
    it('exposes an authenticated client using monitoring host settings', () => {
      const client = instantiateClient(
        serverWithUrl.monitoring.ui.elasticsearch,
        log,
        elasticsearchStart
      );
      const createClusterCall = elasticsearchStart.createClient.mock.calls[0];
      const createClientOptions = createClusterCall[1];

      expect(elasticsearchStart.createClient).toHaveBeenCalledTimes(1);
      expect(createClusterCall[0]).toBe('monitoring');
      expect(createClientOptions?.hosts?.[0]).toEqual('http://monitoring-cluster.test:9200');
      expect(createClientOptions?.username).toEqual('monitoring-user-internal-test');
      expect(createClientOptions?.password).toEqual('monitoring-p@ssw0rd!-internal-test');

      expect(client).toEqual(elasticsearchStart.createClient.mock.results[0].value);
    });
  });

  describe('hasMonitoringCluster', () => {
    it('returns true if monitoring is configured', () => {
      expect(hasMonitoringCluster(serverWithUrl.monitoring.ui.elasticsearch)).toBe(true);
    });

    it('returns false if monitoring is not configured', () => {
      expect(hasMonitoringCluster(server.monitoring.ui.elasticsearch)).toBe(false);
    });
  });
});
