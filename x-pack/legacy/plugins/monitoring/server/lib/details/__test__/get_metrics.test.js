/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMetrics } from '../get_metrics';
import sinon from 'sinon';

import nonDerivMetricsBuckets from './fixtures/non_deriv_metrics_buckets';
import derivMetricsBuckets from './fixtures/deriv_metrics_buckets';
import aggMetricsBuckets from './fixtures/agg_metrics_buckets';

// max / min window that accepts the above buckets/results
const min = 1498968000000; // 2017-07-02T04:00:00.000Z
const max = 1499054399999; // 2017-07-03T03:59:59.999Z

function getMockReq(metricsBuckets = []) {
  const config = {
    get: sinon.stub(),
  };

  config.get.withArgs('xpack.monitoring.min_interval_seconds').returns(10);

  return {
    server: {
      config() {
        return config;
      },
      plugins: {
        elasticsearch: {
          getCluster: sinon
            .stub()
            .withArgs('monitoring')
            .returns({
              callWithRequest: sinon.stub().returns(
                Promise.resolve({
                  aggregations: {
                    check: {
                      buckets: metricsBuckets,
                    },
                  },
                })
              ),
            }),
        },
      },
    },
    payload: {
      timeRange: { min, max },
    },
    params: {
      clusterUuid: '1234xyz',
    },
    getUiSettingsService: () => ({
      get: () => 'Browser',
    }),
  };
}

const indexPattern = [];

describe('getMetrics and getSeries', () => {
  it('should return metrics with non-derivative metric', async () => {
    const req = getMockReq(nonDerivMetricsBuckets);
    const metricSet = ['node_cpu_utilization'];
    const result = await getMetrics(req, indexPattern, metricSet);
    expect(result).toMatchSnapshot();
  });

  it('should return metrics with derivative metric', async () => {
    const req = getMockReq(derivMetricsBuckets);
    const metricSet = ['cluster_search_request_rate'];
    const result = await getMetrics(req, indexPattern, metricSet);
    expect(result).toMatchSnapshot();
  });

  it('should return metrics with metric containing custom aggs', async () => {
    const req = getMockReq(aggMetricsBuckets);
    const metricSet = ['cluster_index_latency'];
    const result = await getMetrics(req, indexPattern, metricSet);
    expect(result).toMatchSnapshot();
  });

  it('should return metrics with object structure for metric', async () => {
    const req = getMockReq(nonDerivMetricsBuckets);
    const metricSet = [
      {
        name: 'index_1',
        keys: [
          'index_mem_overall_1',
          'index_mem_stored_fields',
          'index_mem_doc_values',
          'index_mem_norms',
        ],
      },
    ];
    const result = await getMetrics(req, indexPattern, metricSet);
    expect(result).toMatchSnapshot();
  });

  it('should return metrics with metric that uses default calculation', async () => {
    const req = getMockReq(nonDerivMetricsBuckets);
    const metricSet = ['kibana_max_response_times'];
    const result = await getMetrics(req, indexPattern, metricSet);
    expect(result).toMatchSnapshot();
  });
});
