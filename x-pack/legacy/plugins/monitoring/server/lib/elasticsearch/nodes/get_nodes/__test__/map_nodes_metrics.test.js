/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapNodesMetrics } from '../map_nodes_metrics';

describe('map nodes metrics', () => {
  it('should summarize the info', () => {
    const metricsForNodes = {
      'sg-ldUAbRUCOPIytxxhcIA': {
        node_cpu_utilization: {
          buckets: [
            { doc_count: 1, key: 1517435490000, key_as_string: '2018-01-31T21:51:30.000Z', metric: { value: 0 } },
            { doc_count: 1, key: 1517435500000, key_as_string: '2018-01-31T21:51:40.000Z', metric: { value: 0 }, metric_deriv: { normalized_value: 0, value: 0 } },
            { doc_count: 1, key: 1517435510000, key_as_string: '2018-01-31T21:51:50.000Z', metric: { value: 0 }, metric_deriv: { normalized_value: 0, value: 0 } },
            { doc_count: 1, key: 1517435520000, key_as_string: '2018-01-31T21:52:00.000Z', metric: { value: 0 }, metric_deriv: { normalized_value: 0, value: 0 } },
            { doc_count: 1, key: 1517435530000, key_as_string: '2018-01-31T21:52:10.000Z', metric: { value: 0 }, metric_deriv: { normalized_value: 0, value: 0 } },
            { doc_count: 1, key: 1517435540000, key_as_string: '2018-01-31T21:52:20.000Z', metric: { value: 0 }, metric_deriv: { normalized_value: 0, value: 0 } }
          ]
        },
        node_jvm_mem_percent: {
          buckets: [
            { doc_count: 1, key: 1517435490000, key_as_string: '2018-01-31T21:51:30.000Z', metric: { value: 28 } },
            { doc_count: 1, key: 1517435500000, key_as_string: '2018-01-31T21:51:40.000Z', metric: { value: 35 }, metric_deriv: { normalized_value: 0.7, value: 7 } },
            { doc_count: 1, key: 1517435510000, key_as_string: '2018-01-31T21:51:50.000Z', metric: { value: 15 }, metric_deriv: { normalized_value: -2, value: -20 } },
            { doc_count: 1, key: 1517435520000, key_as_string: '2018-01-31T21:52:00.000Z', metric: { value: 27 }, metric_deriv: { normalized_value: 1.2, value: 12 } },
            { doc_count: 1, key: 1517435530000, key_as_string: '2018-01-31T21:52:10.000Z', metric: { value: 34 }, metric_deriv: { normalized_value: 0.7, value: 7 } },
            { doc_count: 1, key: 1517435540000, key_as_string: '2018-01-31T21:52:20.000Z', metric: { value: 13 }, metric_deriv: { normalized_value: -2.1, value: -21 } }
          ]
        }
      }
    };
    const nodesInfo = {
      'sg-ldUAbRUCOPIytxxhcIA': {
        name: 'whatever01',
        transport_address: '127.0.0.1:9300',
        attributes: {},
        type: 'master',
        isOnline: true,
        nodeTypeLabel: 'Master Node',
        nodeTypeClass: 'fa-star',
        shardCount: 9
      }
    };
    const timeOptions = {
      bucketSize: 10,
      max: 1517435647361,
      min: 1517435487361
    };

    expect(mapNodesMetrics(metricsForNodes, nodesInfo, timeOptions)).toMatchSnapshot();
  });
});
