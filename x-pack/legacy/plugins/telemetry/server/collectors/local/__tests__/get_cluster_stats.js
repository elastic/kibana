/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';

import { TIMEOUT } from '../constants';
import { getClusterStats } from '../get_cluster_stats';

export function mockGetClusterStats(callCluster, clusterStats, req) {
  callCluster.withArgs(req, 'cluster.stats', {
    timeout: TIMEOUT
  })
    .returns(clusterStats);

  callCluster.withArgs('cluster.stats', {
    timeout: TIMEOUT
  })
    .returns(clusterStats);
}

describe('get_cluster_stats', () => {

  it('uses callCluster to get cluster.stats API', () => {
    const callCluster = sinon.stub();
    const response = Promise.resolve({});

    mockGetClusterStats(callCluster, response);

    expect(getClusterStats(callCluster)).to.be(response);
  });

});
