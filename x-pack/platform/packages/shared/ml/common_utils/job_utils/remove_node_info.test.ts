/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeNodeInfo } from './remove_node_info';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

describe('removeNodeInfo', () => {
  test('removes node info and returns a copy of the job', () => {
    const job = {
      job_id: 'test',
      datafeed_config: {
        datafeed_id: 'datafeed-test',
        job_id: 'test',
        indices: ['index1'],
        query: {
          match_all: {},
        },
        node: {
          name: 'node-1',
          ephemeral_id: '1234',
          transport_address: 'localhost:9200',
          attributes: {},
        },
      },
      node: {
        name: 'node-1',
        ephemeral_id: '1234',
        transport_address: 'localhost:9200',
        attributes: {},
      },
    } as never as CombinedJobWithStats;

    const result = removeNodeInfo(job);
    expect(result.job_id).toBe('test');
    expect(result.node).toBe(undefined);
    expect(result.datafeed_config.node).toBe(undefined);

    expect(job.job_id).toBe('test');
    expect(job.node).not.toBe(undefined);
    expect(job.datafeed_config.node).not.toBe(undefined);
  });
});
