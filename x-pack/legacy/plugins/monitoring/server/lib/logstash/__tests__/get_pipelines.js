/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { processPipelinesAPIResponse } from '../get_pipelines';

describe('processPipelinesAPIResponse', () => {
  let response;
  beforeEach(() => {
    response = {
      pipelines: [
        {
          id: 1,
          metrics: {
            throughput_for_cluster: {
              data: [
                [1513721903, 17],
                [1513722162, 23],
              ],
            },
            nodes_count_for_cluster: {
              data: [
                [1513721903, { 1: 5 }],
                [1513722162, { 1: 10 }],
              ],
            },
          },
        },
      ],
    };
  });

  it('normalizes the metric keys', async () => {
    const processedResponse = await processPipelinesAPIResponse(
      response,
      'throughput_for_cluster',
      'nodes_count_for_cluster'
    );
    expect(processedResponse.pipelines[0].metrics.throughput).to.eql(
      response.pipelines[0].metrics.throughput_for_cluster
    );
    expect(processedResponse.pipelines[0].metrics.nodesCount.data[0][0]).to.eql(1513721903);
    expect(processedResponse.pipelines[0].metrics.nodesCount.data[0][1]).to.eql(5);
    expect(processedResponse.pipelines[0].metrics.nodesCount.data[1][0]).to.eql(1513722162);
    expect(processedResponse.pipelines[0].metrics.nodesCount.data[1][1]).to.eql(10);
  });

  it('computes the latest metrics', () => {
    processPipelinesAPIResponse(response, 'throughput_for_cluster', 'nodes_count_for_cluster').then(
      processedResponse => {
        expect(processedResponse.pipelines[0].latestThroughput).to.eql(23);
        expect(processedResponse.pipelines[0].latestNodesCount).to.eql(10);
      }
    );
  });
});
