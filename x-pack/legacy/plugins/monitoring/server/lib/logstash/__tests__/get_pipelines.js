/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { handleGetPipelinesResponse, processPipelinesAPIResponse } from '../get_pipelines';

describe('processPipelinesAPIResponse', () => {
  let response;
  beforeEach(() => {
    response = {
      pipelines: [
        {
          metrics: {
            throughput_for_cluster: {
              data: [[1513721903, 17], [1513722162, 23]],
            },
            nodes_count_for_cluster: {
              data: [[1513721903, 3], [1513722162, 2]],
            },
          },
        },
      ],
    };
  });

  it('normalizes the metric keys', () => {
    processPipelinesAPIResponse(response, 'throughput_for_cluster', 'nodes_count_for_cluster').then(
      processedResponse => {
        expect(processedResponse.pipelines[0].metrics.throughput).to.eql(
          response.pipelines[0].metrics.throughput_for_cluster
        );
        expect(processedResponse.pipelines[0].metrics.nodesCount).to.eql(
          response.pipelines[0].metrics.nodes_count_for_cluster
        );
      }
    );
  });

  it('computes the latest metrics', () => {
    processPipelinesAPIResponse(response, 'throughput_for_cluster', 'nodes_count_for_cluster').then(
      processedResponse => {
        expect(processedResponse.pipelines[0].latestThroughput).to.eql(23);
        expect(processedResponse.pipelines[0].latestNodesCount).to.eql(2);
      }
    );
  });
});

describe('get_pipelines', () => {
  let fetchPipelinesWithMetricsResult;

  describe('fetchPipelinesWithMetrics result contains no pipelines', () => {
    beforeEach(() => {
      fetchPipelinesWithMetricsResult = {
        logstash_pipeline_throughput: [
          {
            data: [],
          },
        ],
        logstash_pipeline_nodes_count: [
          {
            data: [],
          },
        ],
      };
    });

    it('returns an empty array', () => {
      const result = handleGetPipelinesResponse(fetchPipelinesWithMetricsResult);
      expect(result).to.eql([]);
    });
  });

  describe('fetchPipelinesWithMetrics result contains pipelines', () => {
    beforeEach(() => {
      fetchPipelinesWithMetricsResult = {
        logstash_pipeline_throughput: [
          {
            data: [[1513123151000, { apache_logs: 231, logstash_tweets: 34 }]],
          },
        ],
        logstash_pipeline_nodes_count: [
          {
            data: [[1513123151000, { apache_logs: 3, logstash_tweets: 1 }]],
          },
        ],
      };
    });

    it('returns the correct structure for a non-empty response', () => {
      const result = handleGetPipelinesResponse(fetchPipelinesWithMetricsResult);
      expect(result).to.eql([
        {
          id: 'apache_logs',
          metrics: {
            logstash_pipeline_throughput: {
              data: [[1513123151000, 231]],
            },
            logstash_pipeline_nodes_count: {
              data: [[1513123151000, 3]],
            },
          },
        },
        {
          id: 'logstash_tweets',
          metrics: {
            logstash_pipeline_throughput: {
              data: [[1513123151000, 34]],
            },
            logstash_pipeline_nodes_count: {
              data: [[1513123151000, 1]],
            },
          },
        },
      ]);
    });
  });
});
