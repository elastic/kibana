/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { getLogstashStats, logstashMonitoringInstances } from './get_logstash_stats';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CatIndicesResponse } from '@elastic/elasticsearch/lib/api/types';

describe('Get Logstash stats', function () {
  const searchMock = sinon.stub();
  const infoMock = sinon.stub().returns({ cluster_uuid: 'cluster-uuid-1' });
  const catIndicesMock = { indices: sinon.stub() };

  beforeEach(() => {
    searchMock.returns(Promise.resolve({}));
  });

  test('validates self monitoring instance execution', async () => {
    const records: CatIndicesResponse = [
      {
        index: 'monitoring-logstash-8-test',
      },
    ];

    catIndicesMock.indices.returns(Promise.resolve(records));

    const callCluster = {
      search: searchMock,
      info: infoMock,
      cat: catIndicesMock,
    } as unknown as ElasticsearchClient;

    const collectMetricsSpy = sinon.spy(logstashMonitoringInstances.self, 'collectMetrics');
    await getLogstashStats(callCluster, ['cluster1'], 'start', 'end');
    expect(collectMetricsSpy.calledOnce).toBe(true);
  });

  test('validates Metricbeat instance execution', async () => {
    const records: CatIndicesResponse = [
      {
        index: '.ds-metrics-logstash.stack_monitoring-test',
      },
    ];

    catIndicesMock.indices.returns(Promise.resolve(records));

    const callCluster = {
      search: searchMock,
      info: infoMock,
      cat: catIndicesMock,
    } as unknown as ElasticsearchClient;

    const collectMetricsSpy = sinon.spy(logstashMonitoringInstances.metricbeat, 'collectMetrics');
    await getLogstashStats(callCluster, ['cluster1'], 'start', 'end');
    expect(collectMetricsSpy.calledOnce).toBe(true);
  });

  test('validates agent monitoring instance execution', async () => {
    const records: CatIndicesResponse = [
      {
        index: '.ds-metrics-logstash.node-test',
      },
    ];

    catIndicesMock.indices.returns(Promise.resolve(records));

    const callCluster = {
      search: searchMock,
      info: infoMock,
      cat: catIndicesMock,
    } as unknown as ElasticsearchClient;

    const collectMetricsSpy = sinon.spy(logstashMonitoringInstances.agent, 'collectMetrics');
    await getLogstashStats(callCluster, ['cluster1'], 'start', 'end');
    expect(collectMetricsSpy.calledOnce).toBe(true);
  });
});
